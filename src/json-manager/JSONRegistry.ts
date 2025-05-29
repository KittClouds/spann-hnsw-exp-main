
import { jsonManager } from './JSONManager';
import { 
  blockNoteAdapter, 
  cytoscapeAdapter, 
  entityAdapter, 
  noteAdapter 
} from './adapters';

/**
 * JSON Registry - Central registration point for all adapters
 * Initializes the Fort Knox JSON Management System
 */
export class JSONRegistry {
  private static initialized = false;
  
  /**
   * Initialize all JSON adapters and protection systems
   */
  static initialize(): void {
    if (this.initialized) {
      console.log('JSONRegistry: Already initialized');
      return;
    }
    
    console.log('JSONRegistry: Initializing Fort Knox JSON Management System');
    
    // Register all adapters
    jsonManager.registerAdapter('blocknote', blockNoteAdapter);
    jsonManager.registerAdapter('cytoscape', cytoscapeAdapter);
    jsonManager.registerAdapter('entity', entityAdapter);
    jsonManager.registerAdapter('note', noteAdapter);
    
    // Set up periodic cleanup
    setInterval(() => {
      jsonManager.cleanup();
    }, 300000); // Clean every 5 minutes
    
    this.initialized = true;
    console.log('JSONRegistry: Fort Knox JSON Management System ready');
  }
  
  /**
   * Get initialization status
   */
  static isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Force re-initialization (use with caution)
   */
  static forceReinitialize(): void {
    this.initialized = false;
    this.initialize();
  }
}

// Auto-initialize when module is imported
JSONRegistry.initialize();

export { jsonManager } from './JSONManager';
export * from './adapters';
