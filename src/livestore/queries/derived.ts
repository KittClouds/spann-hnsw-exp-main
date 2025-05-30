
import { computed } from '@livestore/livestore';
import { crossNoteRelationService } from '@/services/CrossNoteRelationService';
import { noteEntitiesMap$, noteTriplesMap$ } from '../queries';

/**
 * Derived LiveStore queries for Cross-Note Relation Engine
 * These provide reactive access to computed cross-note relationships
 */

// Entity co-occurrences structured for UI consumption
export const entityCoOccurrences$ = computed((get) => {
  const entitiesMap = get(noteEntitiesMap$);
  const triplesMap = get(noteTriplesMap$);
  
  console.log("LiveStore: Computing entity co-occurrences");
  
  // Update the service with current data
  crossNoteRelationService.updateFromNoteData(entitiesMap, triplesMap);
  
  // Get all co-occurrences and structure for UI consumption
  const allCoOccurrences = crossNoteRelationService.getAllCoOccurrences();
  const coOccurrenceMap = new Map<string, Array<{
    entity: { kind: string; label: string };
    count: number;
    noteIds: string[];
  }>>();
  
  // Group by entity for easy lookup
  allCoOccurrences.forEach(coOcc => {
    const entity1Key = `${coOcc.entity1.kind}::${coOcc.entity1.label}`;
    const entity2Key = `${coOcc.entity2.kind}::${coOcc.entity2.label}`;
    
    // Add to entity1's co-occurrences
    if (!coOccurrenceMap.has(entity1Key)) {
      coOccurrenceMap.set(entity1Key, []);
    }
    coOccurrenceMap.get(entity1Key)!.push({
      entity: coOcc.entity2,
      count: coOcc.count,
      noteIds: coOcc.noteIds
    });
    
    // Add to entity2's co-occurrences
    if (!coOccurrenceMap.has(entity2Key)) {
      coOccurrenceMap.set(entity2Key, []);
    }
    coOccurrenceMap.get(entity2Key)!.push({
      entity: coOcc.entity1,
      count: coOcc.count,
      noteIds: coOcc.noteIds
    });
  });
  
  return coOccurrenceMap;
}, { label: 'entityCoOccurrences$' });

// Global triples consolidated across notes
export const globalTriples$ = computed((get) => {
  const entitiesMap = get(noteEntitiesMap$);
  const triplesMap = get(noteTriplesMap$);
  
  console.log("LiveStore: Computing global triples");
  
  // Update the service with current data
  crossNoteRelationService.updateFromNoteData(entitiesMap, triplesMap);
  
  // Return the global triple index
  return crossNoteRelationService.getAllGlobalTriples();
}, { label: 'globalTriples$' });

// Combined global relations for a specific entity
export const createEntityGlobalRelationsQuery = (entityId: string) => computed((get) => {
  const entitiesMap = get(noteEntitiesMap$);
  const triplesMap = get(noteTriplesMap$);
  
  console.log(`LiveStore: Computing global relations for entity ${entityId}`);
  
  // Update the service with current data
  crossNoteRelationService.updateFromNoteData(entitiesMap, triplesMap);
  
  // Get both co-occurrences and global triples for this entity
  const coOccurrences = crossNoteRelationService.getCoOccurrences(entityId);
  const globalTriples = crossNoteRelationService.getGlobalTriples(entityId);
  
  return {
    coOccurrences,
    globalTriples,
    entityId
  };
}, { label: `entityGlobalRelations$_${entityId}` });

// Top N co-occurring entities (useful for UI components)
export const topCoOccurrences$ = computed((get) => {
  const coOccurrences = get(entityCoOccurrences$);
  const topN = 10;
  
  const allPairs: Array<{
    entity1: string;
    entity2: { kind: string; label: string };
    count: number;
    noteIds: string[];
  }> = [];
  
  coOccurrences.forEach((entityCoOccs, entityKey) => {
    entityCoOccs.slice(0, topN).forEach(coOcc => {
      allPairs.push({
        entity1: entityKey,
        entity2: coOcc.entity,
        count: coOcc.count,
        noteIds: coOcc.noteIds
      });
    });
  });
  
  return allPairs.sort((a, b) => b.count - a.count).slice(0, topN);
}, { label: 'topCoOccurrences$' });

// Most connected global triples
export const topGlobalTriples$ = computed((get) => {
  const globalTriples = get(globalTriples$);
  const topN = 10;
  
  return globalTriples.slice(0, topN);
}, { label: 'topGlobalTriples$' });
