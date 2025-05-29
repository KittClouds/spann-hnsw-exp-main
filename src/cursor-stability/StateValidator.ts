import { Block } from '@blocknote/core';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ContentIntegrity {
  hasValidStructure: boolean;
  hasValidIds: boolean;
  hasValidTypes: boolean;
  hasValidContent: boolean;
  blockCount: number;
  issues: string[];
}

/**
 * Fort Knox State Validator
 * Provides comprehensive validation for content and state integrity
 */
export class StateValidator {
  private static instance: StateValidator | null = null;
  private validBlockTypes = new Set(['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'table', 'image', 'file', 'video', 'audio', 'codeBlock']);
  
  static getInstance(): StateValidator {
    if (!this.instance) {
      this.instance = new StateValidator();
    }
    return this.instance;
  }

  /**
   * Validate content structure and integrity
   */
  validateContent(content: Block[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      severity: 'low'
    };

    if (!Array.isArray(content)) {
      result.isValid = false;
      result.errors.push('Content is not an array');
      result.severity = 'critical';
      return result;
    }

    const seenIds = new Set<string>();
    
    for (let i = 0; i < content.length; i++) {
      const block = content[i];
      const blockErrors = this.validateBlock(block, i, seenIds);
      
      result.errors.push(...blockErrors.errors);
      result.warnings.push(...blockErrors.warnings);
      
      if (!blockErrors.isValid) {
        result.isValid = false;
      }
    }

    // Determine severity
    if (result.errors.length > 0) {
      result.severity = result.errors.some(e => e.includes('critical')) ? 'critical' : 
                       result.errors.length > 5 ? 'high' : 'medium';
    }

    return result;
  }

  private validateBlock(block: any, index: number, seenIds: Set<string>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      severity: 'low'
    };

    // Check if block exists
    if (!block) {
      result.isValid = false;
      result.errors.push(`Block at index ${index} is null or undefined`);
      result.severity = 'critical';
      return result;
    }

    // Check if block is an object
    if (typeof block !== 'object') {
      result.isValid = false;
      result.errors.push(`Block at index ${index} is not an object`);
      result.severity = 'critical';
      return result;
    }

    // Validate block ID
    if (!block.id) {
      result.isValid = false;
      result.errors.push(`Block at index ${index} missing required 'id' field`);
      result.severity = 'high';
    } else if (typeof block.id !== 'string') {
      result.isValid = false;
      result.errors.push(`Block at index ${index} has non-string 'id' field`);
      result.severity = 'high';
    } else if (seenIds.has(block.id)) {
      result.isValid = false;
      result.errors.push(`Duplicate block ID '${block.id}' at index ${index}`);
      result.severity = 'critical';
    } else {
      seenIds.add(block.id);
    }

    // Validate block type
    if (!block.type) {
      result.isValid = false;
      result.errors.push(`Block at index ${index} missing required 'type' field`);
      result.severity = 'high';
    } else if (typeof block.type !== 'string') {
      result.isValid = false;
      result.errors.push(`Block at index ${index} has non-string 'type' field`);
      result.severity = 'high';
    } else if (!this.validBlockTypes.has(block.type)) {
      result.warnings.push(`Block at index ${index} has unknown type '${block.type}'`);
    }

    // Validate block content if present
    if (block.content && !Array.isArray(block.content)) {
      result.warnings.push(`Block at index ${index} has non-array content field`);
    }

    // Validate block props if present - fix the type issue
    if (block.props && typeof block.props !== 'object') {
      result.warnings.push(`Block at index ${index} has non-object props field`);
    }

    return result;
  }

  /**
   * Validate state consistency
   */
  validateStateConsistency(noteId: string, bufferContent: Block[], storeContent: Block[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      severity: 'low'
    };

    if (!bufferContent && !storeContent) {
      return result; // Both empty is valid
    }

    if (!bufferContent || !storeContent) {
      result.isValid = false;
      result.errors.push(`State inconsistency for note ${noteId}: missing buffer or store content`);
      result.severity = 'high';
      return result;
    }

    // Compare lengths
    if (bufferContent.length !== storeContent.length) {
      result.warnings.push(`Content length mismatch for note ${noteId}: buffer=${bufferContent.length}, store=${storeContent.length}`);
    }

    // Compare content structure
    const bufferIds = bufferContent.map(b => b.id).sort();
    const storeIds = storeContent.map(b => b.id).sort();
    
    if (JSON.stringify(bufferIds) !== JSON.stringify(storeIds)) {
      result.isValid = false;
      result.errors.push(`Block ID mismatch for note ${noteId}`);
      result.severity = 'medium';
    }

    return result;
  }

  /**
   * Get content integrity report
   */
  getContentIntegrity(content: Block[]): ContentIntegrity {
    const integrity: ContentIntegrity = {
      hasValidStructure: true,
      hasValidIds: true,
      hasValidTypes: true,
      hasValidContent: true,
      blockCount: 0,
      issues: []
    };

    if (!Array.isArray(content)) {
      integrity.hasValidStructure = false;
      integrity.issues.push('Content is not an array');
      return integrity;
    }

    integrity.blockCount = content.length;
    const seenIds = new Set<string>();

    for (const block of content) {
      if (!block || typeof block !== 'object') {
        integrity.hasValidStructure = false;
        integrity.issues.push('Invalid block structure detected');
        continue;
      }

      if (!block.id || typeof block.id !== 'string') {
        integrity.hasValidIds = false;
        integrity.issues.push('Invalid or missing block ID');
      } else if (seenIds.has(block.id)) {
        integrity.hasValidIds = false;
        integrity.issues.push(`Duplicate block ID: ${block.id}`);
      } else {
        seenIds.add(block.id);
      }

      if (!block.type || typeof block.type !== 'string') {
        integrity.hasValidTypes = false;
        integrity.issues.push('Invalid or missing block type');
      }

      if (block.content && !Array.isArray(block.content)) {
        integrity.hasValidContent = false;
        integrity.issues.push('Invalid block content structure');
      }
    }

    return integrity;
  }

  /**
   * Sanitize and repair content
   */
  sanitizeContent(content: Block[]): Block[] {
    if (!Array.isArray(content)) {
      console.warn('StateValidator: Content is not an array, creating empty array');
      return [];
    }

    const sanitized: Block[] = [];
    const seenIds = new Set<string>();

    for (const block of content) {
      if (!block || typeof block !== 'object') {
        console.warn('StateValidator: Skipping invalid block');
        continue;
      }

      const sanitizedBlock = { ...block };

      // Fix missing or invalid ID
      if (!sanitizedBlock.id || typeof sanitizedBlock.id !== 'string') {
        sanitizedBlock.id = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.warn('StateValidator: Generated new ID for block');
      }

      // Handle duplicate IDs
      if (seenIds.has(sanitizedBlock.id)) {
        sanitizedBlock.id = `${sanitizedBlock.id}-dup-${Date.now()}`;
        console.warn('StateValidator: Fixed duplicate block ID');
      }
      seenIds.add(sanitizedBlock.id);

      // Fix missing or invalid type
      if (!sanitizedBlock.type || typeof sanitizedBlock.type !== 'string') {
        sanitizedBlock.type = 'paragraph';
        console.warn('StateValidator: Set default block type to paragraph');
      }

      // Ensure content is array if present
      if (sanitizedBlock.content && !Array.isArray(sanitizedBlock.content)) {
        sanitizedBlock.content = [];
        console.warn('StateValidator: Fixed invalid block content');
      }

      // Fix props handling - either keep existing valid props or remove them entirely
      if (sanitizedBlock.props && typeof sanitizedBlock.props !== 'object') {
        delete sanitizedBlock.props; // Remove invalid props instead of setting to empty object
        console.warn('StateValidator: Removed invalid block props');
      }

      sanitized.push(sanitizedBlock);
    }

    return sanitized;
  }
}

export const stateValidator = StateValidator.getInstance();
