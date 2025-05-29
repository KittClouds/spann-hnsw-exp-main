
import { Block } from '@blocknote/core';
import { UnifiedSerializableBase } from './UnifiedSerializable';

/**
 * Unified Note Document that integrates with the Fort Knox JSON Management system
 * Provides consistent serialization, validation, and backward compatibility
 */
export class UnifiedNoteDocument extends UnifiedSerializableBase {
  // Define namespace for unified serialization
  gn_namespace = ['app', 'note'];
  
  constructor(
    public id: string,
    public title: string,
    public blocks: Block[],
    public createdAt: string,
    public updatedAt: string,
    gn_id?: string
  ) {
    super({ id, title, blocks, createdAt, updatedAt }, gn_id);
  }
  
  /**
   * Create from JSON with unified deserialization
   */
  static fromJSON(json: Record<string, any>): UnifiedNoteDocument {
    try {
      // Check for unified metadata
      const namespace = json.gn_namespace || [];
      if (Array.isArray(namespace) && 
          namespace[0] === 'app' && 
          namespace[1] === 'note') {
        
        // Create instance with unified data
        return new UnifiedNoteDocument(
          json.id || 'unknown',
          json.title || 'Untitled',
          json.blocks || json.content || [],
          json.createdAt || new Date().toISOString(),
          json.updatedAt || new Date().toISOString(),
          json.gn_id
        );
      }
      
      // Handle legacy format
      if (json.id && json.title) {
        return new UnifiedNoteDocument(
          json.id,
          json.title,
          json.blocks || json.content || [],
          json.createdAt || new Date().toISOString(),
          json.updatedAt || new Date().toISOString(),
          json.gn_id
        );
      }
      
      throw new Error('Invalid JSON format for UnifiedNoteDocument');
      
    } catch (error) {
      console.warn('UnifiedNoteDocument: Falling back to legacy deserialization:', error);
      
      // Last resort: manual construction
      return new UnifiedNoteDocument(
        json.id || 'unknown',
        json.title || 'Untitled',
        json.blocks || json.content || [],
        json.createdAt || new Date().toISOString(),
        json.updatedAt || new Date().toISOString(),
        json.gn_id
      );
    }
  }
  
  /**
   * Validate the note document
   */
  validate(): boolean {
    if (!this.id || !this.title) {
      return false;
    }
    
    if (!Array.isArray(this.blocks)) {
      return false;
    }
    
    // Use unified validation
    return super.validate();
  }
  
  /**
   * Get note-specific metadata
   */
  getNoteMetadata(): {
    id: string;
    title: string;
    blockCount: number;
    lastModified: string;
    serialization: ReturnType<UnifiedSerializableBase['getSerializationMetadata']>;
  } {
    return {
      id: this.id,
      title: this.title,
      blockCount: this.blocks.length,
      lastModified: this.updatedAt,
      serialization: this.getSerializationMetadata()
    };
  }
}
