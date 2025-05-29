
import { Serializable } from './serializable';
import { jsonManager } from '@/json-manager';

/**
 * Enhanced Serializable base class that integrates with Fort Knox JSON Management
 */
export abstract class EnhancedSerializable extends Serializable {
  /**
   * Enhanced toJSON that uses the JSON Manager for serialization
   */
  toJSON(): Record<string, any> {
    try {
      // Get the data type from namespace
      const dataType = this.gn_namespace.join('.');
      
      // Use JSON Manager for serialization if adapter is available
      const registeredAdapters = jsonManager.getRegisteredAdapters();
      const hasAdapter = registeredAdapters.some(({ dataType: dt }) => dt === dataType);
      
      if (hasAdapter) {
        return JSON.parse(jsonManager.serialize(dataType, this.data));
      }
      
      // Fallback to original behavior
      return super.toJSON();
    } catch (error) {
      console.warn('EnhancedSerializable: JSON Manager serialization failed, using fallback:', error);
      return super.toJSON();
    }
  }
  
  /**
   * Enhanced fromJSON that uses the JSON Manager for deserialization
   */
  static fromJSONWithManager<T extends EnhancedSerializable>(
    this: new (...args: any[]) => T,
    json: Record<string, any>,
    dataType: string
  ): T {
    try {
      // Use JSON Manager for deserialization if adapter is available
      const registeredAdapters = jsonManager.getRegisteredAdapters();
      const hasAdapter = registeredAdapters.some(({ dataType: dt }) => dt === dataType);
      
      if (hasAdapter) {
        const data = jsonManager.deserialize(dataType, JSON.stringify(json));
        return new this(data);
      }
      
      // Fallback to creating instance with JSON data
      return new this(json);
    } catch (error) {
      console.warn('EnhancedSerializable: JSON Manager deserialization failed, using fallback:', error);
      return new this(json);
    }
  }
  
  /**
   * Validate JSON using the JSON Manager
   */
  static validateJSON(json: Record<string, any>, dataType: string): boolean {
    try {
      return jsonManager.validateJSON(dataType, JSON.stringify(json));
    } catch (error) {
      console.warn('EnhancedSerializable: JSON validation failed:', error);
      return false;
    }
  }
}
