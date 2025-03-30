
import { join } from 'path';
import { statSync, existsSync } from 'fs';

// Config
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = './public';
const INDEX_HTML = './index.html';

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

// Main server
const server = Bun.serve({
  port: PORT,
  
  fetch(req) {
    const url = new URL(req.url);
    
    // Serve static files
    if (req.method === 'GET') {
      let path = url.pathname;
      return serveStatic(path);
    }
    
    return new Response('Method not allowed', { status: 405 });
  }
});

console.log(`Server running at http://localhost:${PORT}`);
