
import { SerializationAdapter } from '../JSONManager';

/**
 * Unified Serializable Interface
 * Bridges the gap between existing Serializable classes and the JSON Manager
 */
export interface UnifiedSerializable<T = any> {
  /** Unique identifier */
  gn_id?: string;
  
  /** Namespace tags to identify type hierarchy */
  gn_namespace: string[];
  
  /** Convert to JSON using the unified system */
  toUnifiedJSON(): Record<string, any>;
  
  /** Validate the object's state */
  validate(): boolean;
}

/**
 * Adapter Registry for mapping namespaces to JSON Manager data types
 */
export class SerializationAdapterRegistry {
  private static instance: SerializationAdapterRegistry | null = null;
  private namespaceMap = new Map<string, string>();
  private adapters = new Map<string, SerializationAdapter>();
  
  static getInstance(): SerializationAdapterRegistry {
    if (!this.instance) {
      this.instance = new SerializationAdapterRegistry();
    }
    return this.instance;
  }
  
  /**
   * Register a namespace to JSON Manager data type mapping
   */
  registerNamespace(namespace: string[], dataType: string, adapter: SerializationAdapter): void {
    const namespaceKey = namespace.join('.');
    this.namespaceMap.set(namespaceKey, dataType);
    this.adapters.set(dataType, adapter);
    console.log(`SerializationAdapterRegistry: Registered ${namespaceKey} -> ${dataType}`);
  }
  
  /**
   * Get data type for a namespace
   */
  getDataType(namespace: string[]): string | null {
    const namespaceKey = namespace.join('.');
    return this.namespaceMap.get(namespaceKey) || null;
  }
  
  /**
   * Get adapter for a namespace
   */
  getAdapter(namespace: string[]): SerializationAdapter | null {
    const dataType = this.getDataType(namespace);
    return dataType ? this.adapters.get(dataType) || null : null;
  }
}

export const serializationAdapterRegistry = SerializationAdapterRegistry.getInstance();
