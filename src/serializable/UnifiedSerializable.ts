
import { Serializable } from './serializable';
import { jsonManager } from '@/json-manager';
import { serializationAdapterRegistry, UnifiedSerializable } from '@/json-manager/interfaces/UnifiedSerializable';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Serializable base class that integrates with the unified JSON Management system
 * Provides consistent namespace handling, versioning, and backward compatibility
 */
export abstract class UnifiedSerializableBase extends Serializable implements UnifiedSerializable {
  /** Unique identifier for this instance */
  gn_id: string;
  
  /** Version of the serialization format */
  protected version: string = '1.0.0';
  
  constructor(data: Record<string, any>, gn_id?: string) {
    super(data);
    this.gn_id = gn_id || uuidv4();
  }
  
  /**
   * Enhanced toJSON that uses the unified serialization system
   */
  toJSON(): Record<string, any> {
    return this.toUnifiedJSON();
  }
  
  /**
   * Convert to JSON using the unified system with full metadata
   */
  toUnifiedJSON(): Record<string, any> {
    try {
      const dataType = serializationAdapterRegistry.getDataType(this.gn_namespace);
      
      if (dataType) {
        // Use JSON Manager for serialization
        const serializedString = jsonManager.serialize(dataType, this.data);
        const serializedObject = JSON.parse(serializedString);
        
        // Add unified metadata
        return {
          ...serializedObject,
          gn_id: this.gn_id,
          gn_namespace: this.gn_namespace,
          gn_version: this.version,
          gn_serializedAt: new Date().toISOString()
        };
      }
      
      // Fallback to original behavior with enhanced metadata
      return {
        ...this.data,
        gn_id: this.gn_id,
        gn_namespace: this.gn_namespace,
        gn_version: this.version,
        gn_serializedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn('UnifiedSerializableBase: Unified serialization failed, using fallback:', error);
      return super.toJSON();
    }
  }
  
  /**
   * Enhanced fromJSON that uses the unified deserialization system
   */
  static fromUnifiedJSON<T extends UnifiedSerializableBase>(
    this: new (...args: any[]) => T,
    json: Record<string, any>
  ): T {
    try {
      // Check for unified metadata
      const namespace = json.gn_namespace;
      const dataType = namespace ? serializationAdapterRegistry.getDataType(namespace) : null;
      
      if (dataType) {
        // Use JSON Manager for deserialization
        const data = jsonManager.deserialize(dataType, JSON.stringify(json));
        return new this(data, json.gn_id);
      }
      
      // Handle backward compatibility
      if (json._json_meta?.migrated) {
        console.log('UnifiedSerializableBase: Loading migrated data');
        return new this(json, json.gn_id);
      }
      
      // Fallback to creating instance with JSON data
      return new this(json, json.gn_id);
    } catch (error) {
      console.warn('UnifiedSerializableBase: Unified deserialization failed, using fallback:', error);
      return new this(json, json.gn_id);
    }
  }
  
  /**
   * Validate JSON using the unified validation system
   */
  static validateUnifiedJSON(json: Record<string, any>): boolean {
    try {
      const namespace = json.gn_namespace;
      const dataType = namespace ? serializationAdapterRegistry.getDataType(namespace) : null;
      
      if (dataType) {
        return jsonManager.validateJSON(dataType, JSON.stringify(json));
      }
      
      // Basic validation for non-registered types
      return !!(json.gn_namespace && Array.isArray(json.gn_namespace));
    } catch (error) {
      console.warn('UnifiedSerializableBase: Validation failed:', error);
      return false;
    }
  }
  
  /**
   * Validate this object's internal state
   */
  validate(): boolean {
    try {
      const dataType = serializationAdapterRegistry.getDataType(this.gn_namespace);
      if (dataType) {
        return jsonManager.validateJSON(dataType, JSON.stringify(this.data));
      }
      return true;
    } catch (error) {
      console.warn('UnifiedSerializableBase: Instance validation failed:', error);
      return false;
    }
  }
  
  /**
   * Get serialization metadata
   */
  getSerializationMetadata(): {
    id: string;
    namespace: string[];
    version: string;
    dataType: string | null;
    hasAdapter: boolean;
  } {
    const dataType = serializationAdapterRegistry.getDataType(this.gn_namespace);
    const hasAdapter = !!serializationAdapterRegistry.getAdapter(this.gn_namespace);
    
    return {
      id: this.gn_id,
      namespace: this.gn_namespace,
      version: this.version,
      dataType,
      hasAdapter
    };
  }
}
