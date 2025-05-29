import { jsonManager } from './JSONManager';
import { 
  blockNoteAdapter, 
  cytoscapeAdapter, 
  entityAdapter, 
  noteAdapter 
} from './adapters';
import { 
  liveStoreAdapter, 
  backwardCompatibilityAdapter,
  initializeUnifiedAdapters 
} from './adapters/UnifiedAdapters';
import { initializeSchemas } from './schemas';

/**
 * JSON Registry - Central registration point for all adapters including unified serialization
 * Initializes the Fort Knox JSON Management System with backward compatibility
 */
export class JSONRegistry {
  private static initialized = false;
  
  /**
   * Initialize all JSON adapters, unified serialization, and protection systems
   */
  static initialize(): void {
    if (this.initialized) {
      console.log('JSONRegistry: Already initialized');
      return;
    }
    
    console.log('JSONRegistry: Initializing Fort Knox JSON Management System with Unified Serialization');
    
    // Initialize schemas first
    initializeSchemas();
    
    // Initialize unified adapters and namespace mappings
    initializeUnifiedAdapters();
    
    // Register all adapters including new ones
    jsonManager.registerAdapter('blocknote', blockNoteAdapter);
    jsonManager.registerAdapter('cytoscape', cytoscapeAdapter);
    jsonManager.registerAdapter('entity', entityAdapter);
    jsonManager.registerAdapter('note', noteAdapter);
    jsonManager.registerAdapter('livestore', liveStoreAdapter);
    jsonManager.registerAdapter('compatibility', backwardCompatibilityAdapter);
    
    // Set up periodic cleanup
    setInterval(() => {
      jsonManager.cleanup();
    }, 300000); // Clean every 5 minutes
    
    this.initialized = true;
    console.log('JSONRegistry: Fort Knox JSON Management System with Unified Serialization ready');
    
    // Log comprehensive report
    const report = jsonManager.getSchemaReport();
    console.log('JSONRegistry: Schema validation ready for types:', report.registeredTypes);
    console.log('JSONRegistry: Unified serialization adapters initialized');
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
export * from './schemas';
