
import { queryDb, computed } from '@livestore/livestore';
import { tables } from '../schema';
import { parseNoteConnectionsFromDocument } from '@/lib/utils/documentParser';
import { generateEntityId } from '@/lib/utils/ids';
import { Entity, Triple } from '@/lib/utils/parsingUtils';

// Enhanced Entity interface with references
export interface EntityWithReferences extends Entity {
  id: string;
  referenceCount: number;
  referencingNotes: string[];
  lastModified: string;
  createdAt: string;
  relationships: {
    asSubject: Triple[];
    asObject: Triple[];
  };
}

// Core reactive entity queries
export const globalEntities$ = computed((get) => {
  const notes = get(queryDb(tables.notes, { label: 'notesForEntities$' }));
  const entityMap = new Map<string, EntityWithReferences>();
  
  if (!Array.isArray(notes)) return entityMap;
  
  console.log('LiveStore: Computing global entities from notes');
  
  notes.forEach(note => {
    if (!note.content) return;
    
    const connections = parseNoteConnectionsFromDocument(note.content);
    const allEntities = [...connections.entities];
    
    allEntities.forEach(entity => {
      const entityId = generateEntityId(entity.kind, entity.label);
      
      if (entityMap.has(entityId)) {
        const existing = entityMap.get(entityId)!;
        existing.referenceCount++;
        existing.referencingNotes.push(note.id);
        existing.lastModified = note.updatedAt;
      } else {
        entityMap.set(entityId, {
          ...entity,
          id: entityId,
          referenceCount: 1,
          referencingNotes: [note.id],
          lastModified: note.updatedAt,
          createdAt: note.createdAt,
          relationships: {
            asSubject: [],
            asObject: []
          }
        });
      }
    });
    
    // Process triples for relationships
    connections.triples.forEach(triple => {
      const subjectId = generateEntityId(triple.subject.kind, triple.subject.label);
      const objectId = generateEntityId(triple.object.kind, triple.object.label);
      
      const subjectEntity = entityMap.get(subjectId);
      const objectEntity = entityMap.get(objectId);
      
      if (subjectEntity) {
        subjectEntity.relationships.asSubject.push(triple);
      }
      if (objectEntity) {
        objectEntity.relationships.asObject.push(triple);
      }
    });
  });
  
  return entityMap;
}, { label: 'globalEntities$' });

// Entities grouped by cluster
export const clusterEntitiesMap$ = computed((get) => {
  const notes = get(queryDb(tables.notes, { label: 'notesForClusterEntities$' }));
  const clusterMap = new Map<string, EntityWithReferences[]>();
  
  if (!Array.isArray(notes)) return clusterMap;
  
  console.log('LiveStore: Computing cluster entities map');
  
  notes.forEach(note => {
    const clusterId = note.clusterId || 'standard';
    if (!note.content) return;
    
    const connections = parseNoteConnectionsFromDocument(note.content);
    const entities = connections.entities.map(entity => ({
      ...entity,
      id: generateEntityId(entity.kind, entity.label),
      referenceCount: 1,
      referencingNotes: [note.id],
      lastModified: note.updatedAt,
      createdAt: note.createdAt,
      relationships: { asSubject: [], asObject: [] }
    }));
    
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, []);
    }
    clusterMap.get(clusterId)!.push(...entities);
  });
  
  return clusterMap;
}, { label: 'clusterEntitiesMap$' });

// Entities grouped by folder (recursive)
export const folderEntitiesMap$ = computed((get) => {
  const notes = get(queryDb(tables.notes, { label: 'notesForFolderEntities$' }));
  const folderMap = new Map<string, EntityWithReferences[]>();
  
  if (!Array.isArray(notes)) return folderMap;
  
  console.log('LiveStore: Computing folder entities map');
  
  // Helper to get folder hierarchy
  const getFolderPath = (note: any): string => {
    if (!note.parentId) return 'root';
    const parent = notes.find(n => n.id === note.parentId);
    if (!parent) return 'root';
    return parent.type === 'folder' ? parent.id : getFolderPath(parent);
  };
  
  notes.forEach(note => {
    if (!note.content) return;
    
    const folderPath = getFolderPath(note);
    const connections = parseNoteConnectionsFromDocument(note.content);
    const entities = connections.entities.map(entity => ({
      ...entity,
      id: generateEntityId(entity.kind, entity.label),
      referenceCount: 1,
      referencingNotes: [note.id],
      lastModified: note.updatedAt,
      createdAt: note.createdAt,
      relationships: { asSubject: [], asObject: [] }
    }));
    
    if (!folderMap.has(folderPath)) {
      folderMap.set(folderPath, []);
    }
    folderMap.get(folderPath)!.push(...entities);
  });
  
  return folderMap;
}, { label: 'folderEntitiesMap$' });

// Active note entities
export const activeNoteEntities$ = computed((get) => {
  const activeNote = get(queryDb((get) => {
    const uiResults = get(queryDb(tables.uiState, { label: 'uiStateForActiveNote$' }));
    const uiState = Array.isArray(uiResults) && uiResults.length > 0 ? uiResults[0].value : null;
    const activeNoteId = uiState?.activeNoteId;
    
    if (!activeNoteId) {
      return tables.notes.where({ id: '__nonexistent__' });
    }
    return tables.notes.where({ id: activeNoteId });
  }, { label: 'activeNoteQuery$' }));
  
  if (!Array.isArray(activeNote) || activeNote.length === 0 || !activeNote[0].content) {
    return [];
  }
  
  console.log('LiveStore: Computing active note entities');
  
  const note = activeNote[0];
  const connections = parseNoteConnectionsFromDocument(note.content);
  
  return connections.entities.map(entity => ({
    ...entity,
    id: generateEntityId(entity.kind, entity.label),
    referenceCount: 1,
    referencingNotes: [note.id],
    lastModified: note.updatedAt,
    createdAt: note.createdAt,
    relationships: { asSubject: [], asObject: [] }
  }));
}, { label: 'activeNoteEntities$' });

// Entities grouped by type
export const entitiesByType$ = computed((get) => {
  const globalEntities = get(globalEntities$);
  const typeMap = new Map<string, EntityWithReferences[]>();
  
  globalEntities.forEach(entity => {
    if (!typeMap.has(entity.kind)) {
      typeMap.set(entity.kind, []);
    }
    typeMap.get(entity.kind)!.push(entity);
  });
  
  return typeMap;
}, { label: 'entitiesByType$' });

// Entity reference counts
export const entityReferenceCounts$ = computed((get) => {
  const globalEntities = get(globalEntities$);
  const countsMap = new Map<string, number>();
  
  globalEntities.forEach(entity => {
    countsMap.set(entity.id, entity.referenceCount);
  });
  
  return countsMap;
}, { label: 'entityReferenceCounts$' });

// Recent entities (last 30 days)
export const recentEntities$ = computed((get) => {
  const globalEntities = get(globalEntities$);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return Array.from(globalEntities.values()).filter(entity => 
    new Date(entity.createdAt) >= thirtyDaysAgo
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}, { label: 'recentEntities$' });

// Orphaned entities (no references)
export const orphanedEntities$ = computed((get) => {
  const globalEntities = get(globalEntities$);
  
  return Array.from(globalEntities.values()).filter(entity => 
    entity.referenceCount === 0
  );
}, { label: 'orphanedEntities$' });

// Helper function to get all entities as array
export const allEntitiesArray$ = computed((get) => {
  const globalEntities = get(globalEntities$);
  return Array.from(globalEntities.values());
}, { label: 'allEntitiesArray$' });
