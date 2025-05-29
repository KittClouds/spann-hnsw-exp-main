
import { schema, NodeDef } from '../schema';

export interface EntityTypeDefinition {
  kind: string;
  labelProp: string;
  defaultStyle?: any;
  attributes?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'enum';
    label: string;
    default?: any;
    options?: string[];
  }>;
}

/**
 * Registry for entity types with startup initialization
 */
export class EntityTypeRegistry {
  private initialized = false;
  private registeredTypes = new Set<string>();

  /**
   * Initialize entity types for tags and mentions
   */
  initializeDefaultEntityTypes(): void {
    if (this.initialized) {
      console.log('EntityTypeRegistry: Already initialized');
      return;
    }

    console.log('EntityTypeRegistry: Initializing default entity types');

    // Register tag entity type
    this.registerEntityType('tag', {
      kind: 'TAG',
      labelProp: 'label',
      defaultStyle: { 
        'shape': 'round-rectangle', 
        'background-color': '#4ade80',
        'color': '#ffffff',
        'font-size': '12px',
        'padding': '4px'
      }
    });

    // Register mention entity type  
    this.registerEntityType('mention', {
      kind: 'MENTION',
      labelProp: 'label',
      defaultStyle: { 
        'shape': 'ellipse', 
        'background-color': '#60a5fa',
        'color': '#ffffff',
        'font-size': '12px'
      }
    });

    this.initialized = true;
    console.log('EntityTypeRegistry: Default entity types registered');
  }

  /**
   * Register a new entity type
   */
  registerEntityType(key: string, definition: EntityTypeDefinition): void {
    if (this.registeredTypes.has(key)) {
      console.warn(`EntityTypeRegistry: Type ${key} already registered, skipping`);
      return;
    }

    // Convert to NodeDef format and register with schema
    const nodeDef: NodeDef = {
      kind: definition.kind,
      labelProp: definition.labelProp,
      defaultStyle: definition.defaultStyle,
      attributes: definition.attributes
    };

    schema.registerNode(definition.kind, nodeDef);
    this.registeredTypes.add(key);
    
    console.log(`EntityTypeRegistry: Registered entity type ${key} -> ${definition.kind}`);
  }

  /**
   * Check if entity type is registered
   */
  isRegistered(key: string): boolean {
    return this.registeredTypes.has(key);
  }

  /**
   * Get all registered types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.registeredTypes);
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this.initialized = false;
    this.registeredTypes.clear();
  }
}

// Create singleton instance
export const entityTypeRegistry = new EntityTypeRegistry();

/**
 * Initialize entity types - call this at app startup
 */
export function initializeEntityTypes(): void {
  entityTypeRegistry.initializeDefaultEntityTypes();
}
