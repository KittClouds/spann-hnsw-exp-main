
import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { notesAtom, activeClusterIdAtom, noteEntitiesMapAtom } from '@/lib/store';
import { Entity } from '@/lib/utils/parsingUtils';

export interface ClusterEntity extends Entity {
  sourceNoteIds: string[];
  referenceCount: number;
}

export function useActiveClusterEntities(): ClusterEntity[] {
  const [notes] = useAtom(notesAtom);
  const [activeClusterId] = useAtom(activeClusterIdAtom);
  const [entitiesMap] = useAtom(noteEntitiesMapAtom);

  return useMemo(() => {
    // Get all notes in the current cluster
    const clusterNotes = notes.filter(note => note.clusterId === activeClusterId);
    
    const entityMap = new Map<string, ClusterEntity>();
    
    clusterNotes.forEach(note => {
      const noteEntities = entitiesMap.get(note.id) || [];
      
      noteEntities.forEach(entity => {
        const entityKey = `${entity.kind}:${entity.label}`;
        
        if (entityMap.has(entityKey)) {
          const existing = entityMap.get(entityKey)!;
          existing.sourceNoteIds.push(note.id);
          existing.referenceCount++;
        } else {
          entityMap.set(entityKey, {
            ...entity,
            sourceNoteIds: [note.id],
            referenceCount: 1
          });
        }
      });
    });
    
    return Array.from(entityMap.values());
  }, [notes, activeClusterId, entitiesMap]);
}
