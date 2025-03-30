import { join } from 'path';
import { statSync, existsSync } from 'fs';
import { watch } from 'fs/promises';

// Config
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = './public';
const SRC_DIR = './src';
const INDEX_HTML = './index.html';

// Connected clients for hot reload
const clients = new Set<ServerWebSocket<{ id: string; lastActivity: number }>>();

// Track file modification timestamps to avoid extra reloads
const fileModificationTimes = new Map<string, number>();

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

// Check if file change should trigger reload
function shouldReloadOnChange(filename: string): boolean {
  // Don't reload on these files as they typically change during normal editing
  const ignorePatterns = [
    /\.swp$/,      // Vim swap files
    /~$/,          // Backup files
    /\.tmp$/,      // Temporary files
    /node_modules/ // Node modules changes
  ];
  
  // Skip files that match ignore patterns
  for (const pattern of ignorePatterns) {
    if (pattern.test(filename)) {
      return false;
    }
  }
  
  // Get current and previous modification time
  const currentTime = Date.now();
  const lastModified = fileModificationTimes.get(filename) || 0;
  fileModificationTimes.set(filename, currentTime);
  
  // If file was modified within debounce period, don't reload
  const debounceTime = 300; // ms
  if (currentTime - lastModified < debounceTime) {
    return false;
  }
  
  return true;
}

// Watch for file changes
async function watchForChanges() {
  const watcher = watch([SRC_DIR, INDEX_HTML], { recursive: true });
  
  for await (const event of watcher) {
    if (event.filename && !event.filename.includes('node_modules')) {
      console.log(`File changed: ${event.filename}`);
      
      // Only reload if this file change should trigger a reload
      if (shouldReloadOnChange(event.filename)) {
        // Don't reload if client was active in the last 2 seconds
        const reloadThreshold = Date.now() - 2000;
        
        // Filter clients that haven't been active recently
        const inactiveClients = Array.from(clients).filter(
          client => client.data.lastActivity < reloadThreshold
        );
        
        // Only notify inactive clients
        inactiveClients.forEach(client => {
          client.send(JSON.stringify({ type: 'reload' }));
        });
        
        if (inactiveClients.length > 0) {
          console.log(`Reloading ${inactiveClients.length} inactive clients`);
        }
      }
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
      let lastActivity = Date.now();
      let reloadPending = false;
      
      // Track user activity
      function updateActivity() {
        lastActivity = Date.now();
        // Send activity update to server
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'activity', timestamp: lastActivity }));
        }
      }
      
      // Throttle activity updates
      const throttledUpdateActivity = (function() {
        let timeout = null;
        return function() {
          if (timeout === null) {
            timeout = setTimeout(() => {
              updateActivity();
              timeout = null;
            }, 200);
          }
        };
      })();
      
      // Track user interaction events
      document.addEventListener('mousedown', throttledUpdateActivity);
      document.addEventListener('keydown', throttledUpdateActivity);
      document.addEventListener('touchstart', throttledUpdateActivity);
      
      // Handle focus events
      window.addEventListener('focus', updateActivity);
      
      ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          
          // Check if user is actively typing
          const isActivelyTyping = Date.now() - lastActivity < 2000;
          
          if (data.type === 'reload') {
            if (isActivelyTyping) {
              // Delay reload if user is typing
              reloadPending = true;
              console.log('[Hot Reload] Reload pending, waiting for inactivity...');
            } else {
              console.log('[Hot Reload] Reloading page...');
              location.reload();
            }
          }
        } catch (e) {
          console.error('[Hot Reload] Error parsing message:', e);
        }
      };
      
      // Check for pending reloads periodically
      setInterval(() => {
        if (reloadPending && Date.now() - lastActivity > 2000) {
          console.log('[Hot Reload] User inactive, applying pending reload');
          reloadPending = false;
          location.reload();
        }
      }, 1000);
      
      ws.onclose = function() {
        console.log('[Hot Reload] Connection closed. Attempting to reconnect...');
        setTimeout(() => {
          location.reload();
        }, 2000);
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
      const success = server.upgrade(req, { 
        data: { 
          id: crypto.randomUUID(),
          lastActivity: Date.now()
        } 
      });
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
      try {
        const data = JSON.parse(String(message));
        
        if (data.type === 'activity') {
          // Update the client's last activity timestamp
          ws.data.lastActivity = data.timestamp || Date.now();
        }
      } catch (e) {
        console.error(`Error processing message from ${ws.data.id}:`, e);
      }
    }
  }
});

console.log(`Server running at http://localhost:${PORT}`);
