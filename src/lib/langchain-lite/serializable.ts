
import { v4 as uuidv4 } from 'uuid';

/**
 * Base serializable class that can be subclassed to create
 * objects serializable to JSON and storable in a graph.
 */
export abstract class Serializable {
  /** Unique identifier */
  gn_id: string;

  /** Namespace tags to identify type */
  abstract gn_namespace: string[];

  constructor(gn_id?: string) {
    this.gn_id = gn_id || uuidv4();
  }

  /**
   * Serialize object to JSON structure
   */
  toJSON(): Record<string, any> {
    // By default, serialize all non-private and non-method properties
    return Object.fromEntries(
      Object.entries(this)
        .filter(([key]) => !key.startsWith("_") && 
                typeof this[key as keyof this] !== "function")
    );
  }

  /**
   * Deserialize from JSON structure
   * Each subclass should implement this to restore its state
   */
  static fromJSON(json: Record<string, any>): Serializable {
    throw new Error('fromJSON must be implemented by subclass');
  }
  
  /**
   * Creates a shallow copy of this object
   */
  copy(): this {
    const Constructor = this.constructor as typeof Serializable;
    const result = new Constructor() as this;
    Object.assign(result, this);
    return result;
  }
  
  /**
   * Validates this object's internal state
   * Returns true if valid, false otherwise
   */
  validate(): boolean {
    return true; // Base validation just ensures object exists
  }
}
