
import { serve } from "bun";
import { resolve, join } from "path";
import { readdirSync, readFileSync, statSync } from "fs";

const PROJECT_ROOT = import.meta.dir;
const PUBLIC_DIR = join(PROJECT_ROOT, "public");
const SRC_DIR = join(PROJECT_ROOT, "src");
const INDEX_HTML = readFileSync(join(PROJECT_ROOT, "index.html"), "utf8");

// MIME type map for different file extensions
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".jsx": "text/javascript",
  ".ts": "text/javascript",
  ".tsx": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
};

// Get MIME type based on file extension
function getMimeType(filePath: string): string {
  const ext = "." + filePath.split(".").pop() || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

// Process the index.html for development
function processIndexHtml() {
  // Add the development script for hot reloading
  return INDEX_HTML.replace(
    "</body>",
    `<script type="module">
      const ws = new WebSocket(\`ws://\${window.location.host}\`);
      ws.onmessage = () => window.location.reload();
    </script>
    </body>`
  );
}

console.log("Starting Bun development server...");

// Create Bun server
serve({
  port: 8080,
  hostname: "::",
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Handle WebSocket connections for hot reloading
    if (req.headers.get("upgrade") === "websocket") {
      const upgraded = Bun.upgradeWebSocket(req);
      return upgraded.response;
    }

    // Serve index.html for the root path
    if (path === "/" || path === "") {
      return new Response(processIndexHtml(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    try {
      // Try to serve from public directory first
      const publicFilePath = join(PUBLIC_DIR, path);
      try {
        const stat = statSync(publicFilePath);
        if (stat.isFile()) {
          const file = Bun.file(publicFilePath);
          return new Response(file, {
            headers: { "Content-Type": getMimeType(publicFilePath) },
          });
        }
      } catch (e) {
        // File doesn't exist in public, will try src next
      }

      // Handle SPA routing for client-side navigation
      if (!path.includes(".")) {
        return new Response(processIndexHtml(), {
          headers: { "Content-Type": "text/html" },
        });
      }

      // If not found in public, try to serve from the build output
      // For dev mode, we use Bun's bundler to dynamically bundle requested files
      if (path.endsWith(".js") || path.endsWith(".ts") || path.endsWith(".tsx")) {
        // For now, just route everything to main.tsx
        const mainFile = join(SRC_DIR, "main.tsx");
        const result = await Bun.build({
          entrypoints: [mainFile],
          outdir: "./build",
          target: "browser",
          minify: false,
          splitting: true,
        });

        if (!result.success) {
          return new Response(`Build error: ${result.logs.join("\n")}`, {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          });
        }

        // Return the built main.js file
        const mainOutput = result.outputs.find(output => 
          output.path.includes("main") && output.path.endsWith(".js")
        );
        
        if (mainOutput) {
          return new Response(await Bun.file(mainOutput.path).text(), {
            headers: { "Content-Type": "text/javascript" },
          });
        }
      }

      // Handle other static files
      return new Response("Not found", { status: 404 });
    } catch (e) {
      console.error("Server error:", e);
      return new Response("Server error", { status: 500 });
    }
  },
});

console.log("🚀 Server running at http://localhost:8080");

// File watcher for hot reloading
if (process.argv.includes("--hot")) {
  console.log("🔥 Hot reloading enabled");
  const watcher = new Bun.FileSystemWatcher();
  let clients: Set<WebSocket> = new Set();
  
  serve({
    port: 8081,
    fetch(req) {
      if (req.headers.get("upgrade") === "websocket") {
        const upgraded = Bun.upgradeWebSocket(req);
        const { socket } = upgraded;
        
        socket.onopen = () => {
          clients.add(socket);
        };
        
        socket.onclose = () => {
          clients.delete(socket);
        };
        
        return upgraded.response;
      }
      
      return new Response("WebSocket endpoint", { status: 400 });
    }
  });
  
  watcher.add(join(PROJECT_ROOT, "src"));
  watcher.add(join(PROJECT_ROOT, "public"));
  watcher.add(join(PROJECT_ROOT, "index.html"));
  
  watcher.on("change", (path) => {
    console.log(`File changed: ${path}`);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send("reload");
      }
    });
  });
}
