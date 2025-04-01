
import { join } from 'path';
import { statSync, existsSync } from 'fs';
import { ToolsService } from './src/lib/tools/toolsService';
import { Note, Folder, Cluster } from './src/lib/store';

// Config
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = './public';
const INDEX_HTML = './index.html';

// In-memory storage for demo purposes
// In a real implementation, this would be replaced with a database
let notes: Note[] = [];
let folders: Folder[] = [];
let clusters: Cluster[] = [];

// Create tools service instance
const toolsService = new ToolsService(notes, folders, clusters);

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

// Handle API requests
async function handleApiRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Basic CORS headers for API requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders
    });
  }
  
  // Handle API endpoints
  if (path === '/api/llm/interact') {
    try {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        });
      }
      
      const requestData = await req.json();
      const { action, params } = requestData;
      
      if (!action) {
        return new Response(JSON.stringify({ error: 'Action is required' }), { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        });
      }
      
      let result;
      
      // Route the action to the appropriate tool method
      switch (action) {
        // Note operations
        case 'getNote':
          result = await toolsService.getNote(params.noteId);
          break;
        case 'createNote':
          result = await toolsService.createNote(
            params.title,
            params.content,
            params.path,
            params.clusterId
          );
          
          // Update in-memory storage
          if (result.success && result.data) {
            const { notes: updatedNotes } = toolsService.getData();
            notes = updatedNotes;
          }
          break;
        case 'updateNote':
          result = await toolsService.updateNote(params.noteId, params.updates);
          
          // Update in-memory storage
          if (result.success && result.data) {
            const { notes: updatedNotes } = toolsService.getData();
            notes = updatedNotes;
          }
          break;
        case 'deleteNote':
          result = await toolsService.deleteNote(params.noteId);
          
          // Update in-memory storage
          if (result.success && result.data) {
            const { notes: updatedNotes } = toolsService.getData();
            notes = updatedNotes;
          }
          break;
        case 'findNotes':
          result = await toolsService.findNotes(params.filter);
          break;
          
        // Folder operations
        case 'getFolder':
          result = await toolsService.getFolder(params.folderId);
          break;
        case 'createFolder':
          result = await toolsService.createFolder(
            params.name,
            params.parentPath,
            params.clusterId,
            params.parentId
          );
          
          // Update in-memory storage
          if (result.success && result.data) {
            const { folders: updatedFolders } = toolsService.getData();
            folders = updatedFolders;
          }
          break;
        case 'updateFolder':
          result = await toolsService.updateFolder(params.folderId, params.updates);
          
          // Update in-memory storage
          if (result.success && result.data) {
            const { folders: updatedFolders, notes: updatedNotes } = toolsService.getData();
            folders = updatedFolders;
            notes = updatedNotes;
          }
          break;
        case 'deleteFolder':
          result = await toolsService.deleteFolder(params.folderId);
          
          // Update in-memory storage
          if (result.success && result.data) {
            const { folders: updatedFolders } = toolsService.getData();
            folders = updatedFolders;
          }
          break;
        case 'listFolders':
          result = await toolsService.listFolders(params.filter);
          break;
          
        // Cluster operations
        case 'getCluster':
          result = await toolsService.getCluster(params.clusterId);
          break;
        case 'createCluster':
          result = await toolsService.createCluster(params.name);
          
          // Update in-memory storage
          if (result.success && result.data) {
            const { clusters: updatedClusters } = toolsService.getData();
            clusters = updatedClusters;
          }
          break;
        case 'updateCluster':
          result = await toolsService.updateCluster(params.clusterId, params.updates);
          
          // Update in-memory storage
          if (result.success && result.data) {
            const { clusters: updatedClusters } = toolsService.getData();
            clusters = updatedClusters;
          }
          break;
        case 'deleteCluster':
          result = await toolsService.deleteCluster(params.clusterId);
          
          // Update in-memory storage
          if (result.success && result.data) {
            const { clusters: updatedClusters } = toolsService.getData();
            clusters = updatedClusters;
          }
          break;
        case 'listClusters':
          result = await toolsService.listClusters();
          break;
          
        // Knowledge graph operations
        case 'getLinkedNotes':
          result = await toolsService.getLinkedNotes(params.noteId);
          break;
        case 'getLinkingNotes':
          result = await toolsService.getLinkingNotes(params.noteId);
          break;
          
        // Path and navigation helpers
        case 'getPathParts':
          result = await toolsService.getPathParts(params.path);
          break;
        case 'getBreadcrumbs':
          result = await toolsService.getBreadcrumbs(params.path);
          break;
          
        default:
          result = { 
            success: false, 
            error: `Unknown action: ${action}` 
          };
      }
      
      return new Response(JSON.stringify(result), { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      });
      
    } catch (error) {
      console.error('API error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Server error: ${error instanceof Error ? error.message : String(error)}` 
      }), { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      });
    }
  }
  
  // If not an API endpoint, pass through to static file handler
  return new Response('API endpoint not found', { 
    status: 404, 
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders
    } 
  });
}

// Main server
const server = Bun.serve({
  port: PORT,
  
  fetch(req) {
    const url = new URL(req.url);
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(req);
    }
    
    // Serve static files
    if (req.method === 'GET') {
      let path = url.pathname;
      return serveStatic(path);
    }
    
    return new Response('Method not allowed', { status: 405 });
  }
});

console.log(`Server running at http://localhost:${PORT}`);
