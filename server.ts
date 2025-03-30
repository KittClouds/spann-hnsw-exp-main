
import { join } from 'path';
import { statSync, existsSync } from 'fs';
import { watch } from 'fs/promises';

// Config
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = './public';
const SRC_DIR = './src';
const INDEX_HTML = './index.html';

// Connected clients for hot reload
const clients = new Set<ServerWebSocket<{ id: string }>>();

// Helper to serve static files
function serveStatic(path: string) {
  try {
    const filePath = path.endsWith('/') ? join(path, 'index.html') : path;
    const fullPath = filePath.startsWith('/') ? `.${filePath}` : `./${filePath}`;
    
    if (existsSync(fullPath)) {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        return serveStatic(join(fullPath, 'index.html'));
      }
      
      const file = Bun.file(fullPath);
      return new Response(file);
    }
    
    // If the file doesn't exist, try serving index.html for SPA routing
    if (fullPath !== INDEX_HTML) {
      return serveStatic(INDEX_HTML);
    }
    
    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error(`Error serving ${path}:`, error);
    return new Response(`Server Error: ${error}`, { status: 500 });
  }
}

// Watch for file changes
async function watchForChanges() {
  const watcher = watch([SRC_DIR, INDEX_HTML], { recursive: true });
  
  for await (const event of watcher) {
    if (event.filename && !event.filename.includes('node_modules')) {
      console.log(`File changed: ${event.filename}`);
      
      // Notify all connected clients
      clients.forEach(client => {
        client.send(JSON.stringify({ type: 'reload' }));
      });
    }
  }
}

// Start the file watcher
watchForChanges().catch(err => console.error('File watcher error:', err));

// Inject hot reload script into HTML
function injectHotReloadScript(html: string): string {
  const hotReloadScript = `
  <script>
    (function() {
      const ws = new WebSocket('ws://' + location.host + '/__hot_reload');
      
      ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'reload') {
          console.log('[Hot Reload] Reloading page...');
          location.reload();
        }
      };
      
      ws.onclose = function() {
        console.log('[Hot Reload] Connection closed. Attempting to reconnect...');
        setTimeout(() => {
          location.reload();
        }, 1000);
      };
      
      console.log('[Hot Reload] Connected!');
    })();
  </script>
  `;
  
  return html.replace('</body>', `${hotReloadScript}</body>`);
}

// Main server
const server = Bun.serve({
  port: PORT,
  
  fetch(req, server) {
    const url = new URL(req.url);
    
    // Handle WebSocket connections for hot reloading
    if (url.pathname === '/__hot_reload') {
      const success = server.upgrade(req, { data: { id: crypto.randomUUID() } });
      return success ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
    }
    
    // Serve static files
    if (req.method === 'GET') {
      let path = url.pathname;
      
      // Special handling for index.html to inject hot reload script
      if (path === '/' || path === '/index.html') {
        const indexHtml = Bun.file(INDEX_HTML).text();
        return indexHtml.then(html => {
          const modifiedHtml = injectHotReloadScript(html);
          return new Response(modifiedHtml, {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      }
      
      return serveStatic(path);
    }
    
    return new Response('Method not allowed', { status: 405 });
  },
  
  // WebSocket handlers
  websocket: {
    open(ws) {
      clients.add(ws);
      console.log(`Client connected: ${ws.data.id} (Total: ${clients.size})`);
    },
    close(ws) {
      clients.delete(ws);
      console.log(`Client disconnected: ${ws.data.id} (Total: ${clients.size})`);
    },
    message(ws, message) {
      console.log(`Received message from ${ws.data.id}:`, message);
    }
  }
});

console.log(`Server running at http://localhost:${PORT}`);
