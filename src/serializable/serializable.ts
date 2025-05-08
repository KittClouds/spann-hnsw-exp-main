
/**
 * Base class for serializable objects that can be safely converted to JSON
 * while preserving relevant metadata like namespace identifiers
 */
export abstract class Serializable {
  // Namespace identifier for the serializable object type
  abstract gn_namespace: string[];
  
  // Original data used to construct this object
  protected data: Record<string, any>;
  
  constructor(data: Record<string, any>) {
    this.data = data;
  }
  
  /**
   * Converts the object to a plain JSON-serializable object
   * including namespace metadata
   */
  toJSON(): Record<string, any> {
    return {
      ...this.data,
      gn_namespace: this.gn_namespace
    };
  }
  
  /**
   * Recreates a Serializable object from its JSON representation
   * This method should be implemented by each subclass
   * @param json JSON object previously created with toJSON
   */
  static fromJSON(json: Record<string, any>): Serializable {
    throw new Error('fromJSON must be implemented by subclass');
  }
}
