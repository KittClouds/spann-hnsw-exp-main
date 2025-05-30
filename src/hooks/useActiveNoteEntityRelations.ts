
import { useActiveNote, useEntityCoOccurrences, useGlobalTriples } from './useLiveStore';
import { useMemo } from 'react';

/**
 * Hook that aggregates cross-note intelligence for all entities in the active note
 */
export function useActiveNoteEntityRelations() {
  const activeNote = useActiveNote();
  const entityCoOccurrences = useEntityCoOccurrences();
  const globalTriples = useGlobalTriples();
  
  return useMemo(() => {
    if (!activeNote?.entities || activeNote.entities.length === 0) {
      return {
        coOccurrences: [],
        globalTriples: [],
        hasData: false
      };
    }
    
    const noteEntityKeys = activeNote.entities.map(entity => 
      `${entity.kind}::${entity.label}`
    );
    
    // Aggregate co-occurrences for all entities in the note
    const aggregatedCoOccurrences = new Map<string, {
      entity: { kind: string; label: string };
      count: number;
      noteIds: string[];
    }>();
    
    noteEntityKeys.forEach(entityKey => {
      const entityCoOccs = entityCoOccurrences.get(entityKey) || [];
      entityCoOccs.forEach(coOcc => {
        const key = `${coOcc.entity.kind}::${coOcc.entity.label}`;
        const existing = aggregatedCoOccurrences.get(key);
        
        if (!existing || coOcc.count > existing.count) {
          aggregatedCoOccurrences.set(key, coOcc);
        }
      });
    });
    
    // Filter global triples that involve entities from this note
    const relevantTriples = globalTriples.filter(triple => {
      const subjectKey = `${triple.subject.kind}::${triple.subject.label}`;
      const objectKey = `${triple.object.kind}::${triple.object.label}`;
      return noteEntityKeys.includes(subjectKey) || noteEntityKeys.includes(objectKey);
    });
    
    return {
      coOccurrences: Array.from(aggregatedCoOccurrences.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10), // Top 10 co-occurrences
      globalTriples: relevantTriples.slice(0, 10), // Top 10 global triples
      hasData: aggregatedCoOccurrences.size > 0 || relevantTriples.length > 0
    };
  }, [activeNote, entityCoOccurrences, globalTriples]);
}
