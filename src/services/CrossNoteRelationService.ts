
import { Entity, Triple } from '@/lib/utils/parsingUtils';
import { generateEntityId } from '@/lib/utils/ids';

export interface CoOccurrence {
  count: number;
  noteIds: Set<string>;
}

export interface GlobalTriple {
  subject: Entity;
  predicate: string;
  object: Entity;
  noteIds: Set<string>;
  count: number;
}

/**
 * Cross-Note Relation Engine
 * Calculates co-occurrences and consolidates global triples across notes
 * This is a pure computation service - it doesn't write to the graph
 */
export class CrossNoteRelationService {
  private static instance: CrossNoteRelationService;
  
  // Core data structures
  private coOccurrenceMatrix = new Map<string, CoOccurrence>();
  private globalTripleIndex = new Map<string, GlobalTriple>();
  
  // Cache for entity lookups
  private entityToNotesMap = new Map<string, Set<string>>();
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  static getInstance(): CrossNoteRelationService {
    if (!CrossNoteRelationService.instance) {
      CrossNoteRelationService.instance = new CrossNoteRelationService();
    }
    return CrossNoteRelationService.instance;
  }
  
  /**
   * Update the service with current note data
   * This should be called whenever noteEntitiesMap$ or noteTriplesMap$ changes
   */
  updateFromNoteData(
    noteEntitiesMap: Map<string, Entity[]>,
    noteTriplesMap: Map<string, Triple[]>
  ): void {
    // Clear existing data
    this.coOccurrenceMatrix.clear();
    this.globalTripleIndex.clear();
    this.entityToNotesMap.clear();
    
    // Build entity-to-notes mapping
    this.buildEntityToNotesMap(noteEntitiesMap);
    
    // Calculate co-occurrences
    this.calculateCoOccurrences(noteEntitiesMap);
    
    // Consolidate global triples
    this.consolidateGlobalTriples(noteTriplesMap);
  }
  
  /**
   * Build mapping of entities to the notes they appear in
   */
  private buildEntityToNotesMap(noteEntitiesMap: Map<string, Entity[]>): void {
    for (const [noteId, entities] of noteEntitiesMap) {
      for (const entity of entities) {
        const entityKey = this.getEntityKey(entity);
        if (!this.entityToNotesMap.has(entityKey)) {
          this.entityToNotesMap.set(entityKey, new Set());
        }
        this.entityToNotesMap.get(entityKey)!.add(noteId);
      }
    }
  }
  
  /**
   * Calculate co-occurrence relationships between entities
   */
  private calculateCoOccurrences(noteEntitiesMap: Map<string, Entity[]>): void {
    for (const [noteId, entities] of noteEntitiesMap) {
      // For each pair of entities in the same note
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const entity1 = entities[i];
          const entity2 = entities[j];
          
          const coOccurrenceKey = this.getCoOccurrenceKey(entity1, entity2);
          
          if (!this.coOccurrenceMatrix.has(coOccurrenceKey)) {
            this.coOccurrenceMatrix.set(coOccurrenceKey, {
              count: 0,
              noteIds: new Set()
            });
          }
          
          const coOccurrence = this.coOccurrenceMatrix.get(coOccurrenceKey)!;
          coOccurrence.noteIds.add(noteId);
          coOccurrence.count = coOccurrence.noteIds.size;
        }
      }
    }
  }
  
  /**
   * Consolidate identical triples from multiple notes into global relationships
   */
  private consolidateGlobalTriples(noteTriplesMap: Map<string, Triple[]>): void {
    for (const [noteId, triples] of noteTriplesMap) {
      for (const triple of triples) {
        const tripleKey = this.getTripleKey(triple);
        
        if (!this.globalTripleIndex.has(tripleKey)) {
          this.globalTripleIndex.set(tripleKey, {
            subject: triple.subject,
            predicate: triple.predicate,
            object: triple.object,
            noteIds: new Set(),
            count: 0
          });
        }
        
        const globalTriple = this.globalTripleIndex.get(tripleKey)!;
        globalTriple.noteIds.add(noteId);
        globalTriple.count = globalTriple.noteIds.size;
      }
    }
  }
  
  /**
   * Get co-occurrences for a specific entity
   */
  getCoOccurrences(entityId: string): Array<{
    entity: { kind: string; label: string };
    count: number;
    noteIds: string[];
  }> {
    const results: Array<{
      entity: { kind: string; label: string };
      count: number;
      noteIds: string[];
    }> = [];
    
    for (const [key, coOccurrence] of this.coOccurrenceMatrix) {
      const [entity1Key, entity2Key] = key.split('|');
      
      // Check if the given entityId matches either entity in the co-occurrence
      if (entity1Key === entityId || entity2Key === entityId) {
        const otherEntityKey = entity1Key === entityId ? entity2Key : entity1Key;
        const [kind, label] = this.parseEntityKey(otherEntityKey);
        
        results.push({
          entity: { kind, label },
          count: coOccurrence.count,
          noteIds: Array.from(coOccurrence.noteIds)
        });
      }
    }
    
    return results.sort((a, b) => b.count - a.count);
  }
  
  /**
   * Get global triples that involve a specific entity
   */
  getGlobalTriples(entityId: string): Array<{
    triple: GlobalTriple;
    role: 'subject' | 'object';
  }> {
    const results: Array<{
      triple: GlobalTriple;
      role: 'subject' | 'object';
    }> = [];
    
    for (const [key, globalTriple] of this.globalTripleIndex) {
      const subjectKey = this.getEntityKey(globalTriple.subject);
      const objectKey = this.getEntityKey(globalTriple.object);
      
      if (subjectKey === entityId) {
        results.push({ triple: globalTriple, role: 'subject' });
      } else if (objectKey === entityId) {
        results.push({ triple: globalTriple, role: 'object' });
      }
    }
    
    return results.sort((a, b) => b.triple.count - a.triple.count);
  }
  
  /**
   * Get all global triples
   */
  getAllGlobalTriples(): GlobalTriple[] {
    return Array.from(this.globalTripleIndex.values())
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * Get all co-occurrences
   */
  getAllCoOccurrences(): Array<{
    entity1: { kind: string; label: string };
    entity2: { kind: string; label: string };
    count: number;
    noteIds: string[];
  }> {
    const results: Array<{
      entity1: { kind: string; label: string };
      entity2: { kind: string; label: string };
      count: number;
      noteIds: string[];
    }> = [];
    
    for (const [key, coOccurrence] of this.coOccurrenceMatrix) {
      const [entity1Key, entity2Key] = key.split('|');
      const [kind1, label1] = this.parseEntityKey(entity1Key);
      const [kind2, label2] = this.parseEntityKey(entity2Key);
      
      results.push({
        entity1: { kind: kind1, label: label1 },
        entity2: { kind: kind2, label: label2 },
        count: coOccurrence.count,
        noteIds: Array.from(coOccurrence.noteIds)
      });
    }
    
    return results.sort((a, b) => b.count - a.count);
  }
  
  /**
   * Generate a canonical key for an entity
   */
  private getEntityKey(entity: Entity): string {
    return generateEntityId(entity.kind, entity.label);
  }
  
  /**
   * Generate a canonical key for co-occurrence (order independent)
   */
  private getCoOccurrenceKey(entity1: Entity, entity2: Entity): string {
    const key1 = this.getEntityKey(entity1);
    const key2 = this.getEntityKey(entity2);
    
    // Ensure consistent ordering for bidirectional relationships
    return key1 < key2 ? `${key1}|${key2}` : `${key2}|${key1}`;
  }
  
  /**
   * Generate a canonical key for a triple
   */
  private getTripleKey(triple: Triple): string {
    const subjectKey = this.getEntityKey(triple.subject);
    const objectKey = this.getEntityKey(triple.object);
    return `${subjectKey}:${triple.predicate}:${objectKey}`;
  }
  
  /**
   * Parse an entity key back to kind and label
   */
  private parseEntityKey(entityKey: string): [string, string] {
    const parts = entityKey.split('::');
    return parts.length === 2 ? [parts[0], parts[1]] : ['unknown', entityKey];
  }
}

// Export singleton instance
export const crossNoteRelationService = CrossNoteRelationService.getInstance();
