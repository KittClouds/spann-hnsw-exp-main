import { Note, Folder, Cluster, getCurrentDate, generateId, generateFolderId, generateClusterId } from '../store';
import { ToolResult, NoteFilter, FolderFilter, ToolsInterface } from './types';
import { KnowledgeGraph } from '../knowledgeGraph';

// Helper function to create tool results
const success = <T>(data: T): ToolResult<T> => ({
  success: true,
  data
});

const failure = <T>(error: string): ToolResult<T> => ({
  success: false,
  error
});

export class ToolsService implements ToolsInterface {
  private notes: Note[];
  private folders: Folder[];
  private clusters: Cluster[];
  private knowledgeGraph: KnowledgeGraph;
  
  constructor(
    notes: Note[] = [], 
    folders: Folder[] = [], 
    clusters: Cluster[] = [],
    knowledgeGraph?: KnowledgeGraph
  ) {
    this.notes = [...notes];
    this.folders = [...folders];
    this.clusters = [...clusters];
    this.knowledgeGraph = knowledgeGraph || new KnowledgeGraph();
    
    // Initialize knowledge graph if provided with data
    if (notes.length > 0 || folders.length > 0) {
      this.knowledgeGraph.buildGraph(this.notes, this.folders);
    }
  }
  
  // Stats method for debugging
  getStats(): { notes: number, folders: number, clusters: number } {
    return {
      notes: this.notes.length,
      folders: this.folders.length,
      clusters: this.clusters.length
    };
  }
  
  // Note operations
  async getNote(noteId: string): Promise<ToolResult<Note | null>> {
    try {
      const note = this.notes.find(note => note.id === noteId);
      return success(note || null);
    } catch (error) {
      return failure(`Failed to get note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async createNote(
    title: string, 
    content: any[] = [{ type: 'paragraph', content: '' }], 
    path: string = '/', 
    clusterId: string
  ): Promise<ToolResult<Note>> {
    try {
      const newId = generateId();
      const now = getCurrentDate();
      
      const newNote: Note = {
        id: newId,
        title,
        content,
        path,
        clusterId,
        createdAt: now,
        updatedAt: now,
        tags: []
      };
      
      this.notes.push(newNote);
      this.knowledgeGraph.buildGraph(this.notes, this.folders);
      
      return success(newNote);
    } catch (error) {
      return failure(`Failed to create note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async updateNote(noteId: string, updates: Partial<Note>): Promise<ToolResult<Note>> {
    try {
      const noteIndex = this.notes.findIndex(note => note.id === noteId);
      
      if (noteIndex === -1) {
        return failure(`Note with ID ${noteId} not found`);
      }
      
      const updatedNote = {
        ...this.notes[noteIndex],
        ...updates,
        updatedAt: getCurrentDate()
      };
      
      this.notes[noteIndex] = updatedNote;
      this.knowledgeGraph.buildGraph(this.notes, this.folders);
      
      return success(updatedNote);
    } catch (error) {
      return failure(`Failed to update note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async deleteNote(noteId: string): Promise<ToolResult<boolean>> {
    try {
      const initialLength = this.notes.length;
      this.notes = this.notes.filter(note => note.id !== noteId);
      
      if (this.notes.length === initialLength) {
        return failure(`Note with ID ${noteId} not found`);
      }
      
      this.knowledgeGraph.buildGraph(this.notes, this.folders);
      return success(true);
    } catch (error) {
      return failure(`Failed to delete note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async findNotes(filter?: NoteFilter): Promise<ToolResult<Note[]>> {
    try {
      let filteredNotes = [...this.notes];
      
      if (!filter) return success(filteredNotes);
      
      if (filter.path) {
        filteredNotes = filteredNotes.filter(note => note.path === filter.path);
      }
      
      if (filter.clusterId) {
        filteredNotes = filteredNotes.filter(note => note.clusterId === filter.clusterId);
      }
      
      if (filter.tags && filter.tags.length > 0) {
        filteredNotes = filteredNotes.filter(note => 
          filter.tags!.some(tag => note.tags.includes(tag))
        );
      }
      
      if (filter.textContent) {
        filteredNotes = filteredNotes.filter(note => {
          // Simple text search through content blocks
          const searchText = filter.textContent!.toLowerCase();
          
          // Check title
          if (note.title.toLowerCase().includes(searchText)) return true;
          
          // Check content blocks
          const hasMatchingContent = note.content.some(block => {
            if (typeof block.content === 'string') {
              return block.content.toLowerCase().includes(searchText);
            } else if (Array.isArray(block.content)) {
              return JSON.stringify(block.content).toLowerCase().includes(searchText);
            }
            return false;
          });
          
          return hasMatchingContent;
        });
      }
      
      // Date filters
      if (filter.createdAfter) {
        filteredNotes = filteredNotes.filter(note => note.createdAt >= filter.createdAfter!);
      }
      
      if (filter.createdBefore) {
        filteredNotes = filteredNotes.filter(note => note.createdAt <= filter.createdBefore!);
      }
      
      if (filter.updatedAfter) {
        filteredNotes = filteredNotes.filter(note => note.updatedAt >= filter.updatedAfter!);
      }
      
      if (filter.updatedBefore) {
        filteredNotes = filteredNotes.filter(note => note.updatedAt <= filter.updatedBefore!);
      }
      
      return success(filteredNotes);
    } catch (error) {
      return failure(`Failed to find notes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Folder operations
  async getFolder(folderId: string): Promise<ToolResult<Folder | null>> {
    try {
      const folder = this.folders.find(folder => folder.id === folderId);
      return success(folder || null);
    } catch (error) {
      return failure(`Failed to get folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async createFolder(
    name: string, 
    parentPath: string = '/', 
    clusterId: string,
    parentId: string | null = null
  ): Promise<ToolResult<Folder>> {
    try {
      // Check if a folder with this name already exists at this path
      const path = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
      const folderExists = this.folders.some(
        folder => folder.path === path && folder.clusterId === clusterId
      );
      
      if (folderExists) {
        return failure(`A folder named "${name}" already exists at path "${parentPath}"`);
      }
      
      const newId = generateFolderId();
      const now = getCurrentDate();
      
      const newFolder: Folder = {
        id: newId,
        name,
        path,
        parentId,
        clusterId,
        createdAt: now,
        updatedAt: now
      };
      
      this.folders.push(newFolder);
      return success(newFolder);
    } catch (error) {
      return failure(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async updateFolder(folderId: string, updates: Partial<Folder>): Promise<ToolResult<Folder>> {
    try {
      const folderIndex = this.folders.findIndex(folder => folder.id === folderId);
      
      if (folderIndex === -1) {
        return failure(`Folder with ID ${folderId} not found`);
      }
      
      // Handle name/path updates specially
      if (updates.name && updates.name !== this.folders[folderIndex].name) {
        const oldPath = this.folders[folderIndex].path;
        const pathParts = oldPath.split('/').filter(Boolean);
        pathParts.pop(); // Remove old name
        
        const parentPath = pathParts.length ? `/${pathParts.join('/')}` : '/';
        const newPath = parentPath === '/' ? `/${updates.name}` : `${parentPath}/${updates.name}`;
        
        // Update this folder's path
        updates.path = newPath;
        
        // Update all child folder paths
        for (let i = 0; i < this.folders.length; i++) {
          if (i !== folderIndex && this.folders[i].path.startsWith(oldPath + '/')) {
            const restOfPath = this.folders[i].path.slice(oldPath.length);
            this.folders[i].path = newPath + restOfPath;
            this.folders[i].updatedAt = getCurrentDate();
          }
        }
        
        // Update all note paths
        for (const note of this.notes) {
          if (note.path === oldPath) {
            note.path = newPath;
            note.updatedAt = getCurrentDate();
          } else if (note.path.startsWith(oldPath + '/')) {
            const restOfPath = note.path.slice(oldPath.length);
            note.path = newPath + restOfPath;
            note.updatedAt = getCurrentDate();
          }
        }
      }
      
      const updatedFolder = {
        ...this.folders[folderIndex],
        ...updates,
        updatedAt: getCurrentDate()
      };
      
      this.folders[folderIndex] = updatedFolder;
      this.knowledgeGraph.buildGraph(this.notes, this.folders);
      
      return success(updatedFolder);
    } catch (error) {
      return failure(`Failed to update folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async deleteFolder(folderId: string): Promise<ToolResult<boolean>> {
    try {
      const folder = this.folders.find(f => f.id === folderId);
      
      if (!folder) {
        return failure(`Folder with ID ${folderId} not found`);
      }
      
      // Check if the folder has subfolders
      const hasSubFolders = this.folders.some(f => f.parentId === folderId);
      
      if (hasSubFolders) {
        return failure(`Cannot delete folder with subfolders`);
      }
      
      // Check if the folder contains notes
      const hasNotes = this.notes.some(note => note.path === folder.path);
      
      if (hasNotes) {
        return failure(`Cannot delete folder containing notes`);
      }
      
      this.folders = this.folders.filter(f => f.id !== folderId);
      return success(true);
    } catch (error) {
      return failure(`Failed to delete folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async listFolders(filter?: FolderFilter): Promise<ToolResult<Folder[]>> {
    try {
      let filteredFolders = [...this.folders];
      
      if (!filter) return success(filteredFolders);
      
      if (filter.clusterId) {
        filteredFolders = filteredFolders.filter(folder => folder.clusterId === filter.clusterId);
      }
      
      if (filter.parentId !== undefined) {
        filteredFolders = filteredFolders.filter(folder => folder.parentId === filter.parentId);
      }
      
      if (filter.path) {
        filteredFolders = filteredFolders.filter(folder => folder.path === filter.path);
      }
      
      return success(filteredFolders);
    } catch (error) {
      return failure(`Failed to list folders: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Cluster operations
  async getCluster(clusterId: string): Promise<ToolResult<Cluster | null>> {
    try {
      const cluster = this.clusters.find(cluster => cluster.id === clusterId);
      return success(cluster || null);
    } catch (error) {
      return failure(`Failed to get cluster: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async createCluster(name: string): Promise<ToolResult<Cluster>> {
    try {
      // Check if a cluster with this name already exists
      const clusterExists = this.clusters.some(cluster => cluster.name === name);
      
      if (clusterExists) {
        return failure(`A cluster named "${name}" already exists`);
      }
      
      const newId = generateClusterId();
      const now = getCurrentDate();
      
      const newCluster: Cluster = {
        id: newId,
        name,
        createdAt: now,
        updatedAt: now
      };
      
      this.clusters.push(newCluster);
      return success(newCluster);
    } catch (error) {
      return failure(`Failed to create cluster: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async updateCluster(clusterId: string, updates: Partial<Cluster>): Promise<ToolResult<Cluster>> {
    try {
      const clusterIndex = this.clusters.findIndex(cluster => cluster.id === clusterId);
      
      if (clusterIndex === -1) {
        return failure(`Cluster with ID ${clusterId} not found`);
      }
      
      const updatedCluster = {
        ...this.clusters[clusterIndex],
        ...updates,
        updatedAt: getCurrentDate()
      };
      
      this.clusters[clusterIndex] = updatedCluster;
      return success(updatedCluster);
    } catch (error) {
      return failure(`Failed to update cluster: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async deleteCluster(clusterId: string): Promise<ToolResult<boolean>> {
    try {
      // Check if cluster exists
      const clusterExists = this.clusters.some(cluster => cluster.id === clusterId);
      
      if (!clusterExists) {
        return failure(`Cluster with ID ${clusterId} not found`);
      }
      
      // Check if the cluster is empty (no folders or notes)
      const hasContent = this.folders.some(folder => folder.clusterId === clusterId) || 
                         this.notes.some(note => note.clusterId === clusterId);
      
      if (hasContent) {
        return failure(`Cannot delete non-empty cluster. Move or delete its content first.`);
      }
      
      this.clusters = this.clusters.filter(cluster => cluster.id !== clusterId);
      return success(true);
    } catch (error) {
      return failure(`Failed to delete cluster: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async listClusters(): Promise<ToolResult<Cluster[]>> {
    try {
      return success([...this.clusters]);
    } catch (error) {
      return failure(`Failed to list clusters: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Knowledge graph operations
  async getLinkedNotes(noteId: string): Promise<ToolResult<Note[]>> {
    try {
      const noteAttributes = this.knowledgeGraph.getLinkedNotes(noteId);
      
      // Map node attributes back to full notes
      const linkedNotes = noteAttributes.map(attr => {
        return this.notes.find(note => note.id === attr.id) || null;
      }).filter(Boolean) as Note[];
      
      return success(linkedNotes);
    } catch (error) {
      return failure(`Failed to get linked notes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async getLinkingNotes(noteId: string): Promise<ToolResult<Note[]>> {
    try {
      const noteAttributes = this.knowledgeGraph.getLinkingNotes(noteId);
      
      // Map node attributes back to full notes
      const linkingNotes = noteAttributes.map(attr => {
        return this.notes.find(note => note.id === attr.id) || null;
      }).filter(Boolean) as Note[];
      
      return success(linkingNotes);
    } catch (error) {
      return failure(`Failed to get linking notes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Path and navigation helpers
  async getPathParts(path: string): Promise<ToolResult<string[]>> {
    try {
      if (path === '/') return success(['/']);
      return success(['/', ...path.split('/').filter(Boolean)]);
    } catch (error) {
      return failure(`Failed to get path parts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async getBreadcrumbs(path: string): Promise<ToolResult<{name: string; path: string}[]>> {
    try {
      if (path === '/') {
        return success([{ name: 'Home', path: '/' }]);
      }
      
      const parts = path.split('/').filter(Boolean);
      const breadcrumbs = [{ name: 'Home', path: '/' }];
      
      let currentPath = '';
      for (const part of parts) {
        currentPath += `/${part}`;
        const folder = this.folders.find(f => f.path === currentPath);
        breadcrumbs.push({ 
          name: folder?.name || part, 
          path: currentPath 
        });
      }
      
      return success(breadcrumbs);
    } catch (error) {
      return failure(`Failed to get breadcrumbs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Data manipulation
  getData(): { notes: Note[]; folders: Folder[]; clusters: Cluster[] } {
    return {
      notes: [...this.notes],
      folders: [...this.folders],
      clusters: [...this.clusters]
    };
  }
  
  setData(notes: Note[], folders: Folder[], clusters: Cluster[]): void {
    this.notes = [...notes];
    this.folders = [...folders];
    this.clusters = [...clusters];
    this.knowledgeGraph.buildGraph(this.notes, this.folders);
  }
}
