
import { join } from "path";
import { statSync, readdirSync } from "fs";

// Simple HTML template for our app
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Galaxy Notes</title>
    <meta name="description" content="Multi-note block editor with automatic saving" />
    <meta name="author" content="Lovable" />

    <meta property="og:title" content="Galaxy Notes" />
    <meta property="og:description" content="Multi-note block editor with automatic saving" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@lovable_dev" />
    <meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
  </head>
  <body>
    <div id="root"></div>
    <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
    <script src="/src/main.tsx" type="module"></script>
  </body>
</html>
`;

// List of file extensions to serve
const fileExtensions = [".tsx", ".ts", ".js", ".jsx", ".css", ".json", ".svg", ".png", ".jpg", ".jpeg", ".gif"];

// Serve static files from public directory
function serveStaticFile(path: string) {
  try {
    return new Response(Bun.file(path));
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
}

// Main server
console.log("🚀 Starting Galaxy Notes server...");
console.log("🔥 Hot reload enabled");

Bun.serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Return index.html for the root path
    if (path === "/") {
      return new Response(htmlTemplate, {
        headers: { "Content-Type": "text/html" },
      });
    }
    
    // Check if the request is for a file in the public directory
    if (path.startsWith("/public/")) {
      const filePath = path.slice(1); // Remove leading slash
      return serveStaticFile(filePath);
    }
    
    // Check if the request is for a source file
    if (fileExtensions.some(ext => path.endsWith(ext))) {
      try {
        // Try to serve the file directly
        const filePath = path.startsWith("/") ? path.slice(1) : path;
        return serveStaticFile(filePath);
      } catch (err) {
        return new Response(`File not found: ${path}`, { status: 404 });
      }
    }
    
    // Default to index.html for client-side routing
    return new Response(htmlTemplate, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log("🌐 Server running at http://localhost:8080");
