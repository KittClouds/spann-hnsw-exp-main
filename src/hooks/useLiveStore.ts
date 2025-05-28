
import { useStore, useQuery } from '@livestore/react';
import { useCallback } from 'react';
import { events } from '../livestore/schema';
import { 
  notes$, 
  clusters$, 
  activeNote$, 
  activeNoteId$, 
  activeClusterId$,
  activeNoteConnections$,
  noteTagsMap$,
  noteMentionsMap$,
  noteLinksMap$,
  noteEntitiesMap$,
  noteTriplesMap$,
  threads$,
  threadMessages$,
  activeThreadId$,
  activeThreadMessages$,
  blueprints$
} from '../livestore/queries';
import { generateNoteId, generateClusterId, generateNodeId } from '@/lib/utils/ids';

// Hook that provides Jotai-like interface for LiveStore
export function useLiveStore() {
  const { store } = useStore();

  // Reactive queries
  const notes = useQuery(notes$);
  const clusters = useQuery(clusters$);
  const activeNote = useQuery(activeNote$);
  const activeNoteId = useQuery(activeNoteId$);
  const activeClusterId = useQuery(activeClusterId$);
  const activeNoteConnections = useQuery(activeNoteConnections$);
  const noteTagsMap = useQuery(noteTagsMap$);
  const noteMentionsMap = useQuery(noteMentionsMap$);
  const noteLinksMap = useQuery(noteLinksMap$);
  const noteEntitiesMap = useQuery(noteEntitiesMap$);
  const noteTriplesMap = useQuery(noteTriplesMap$);
  const threads = useQuery(threads$);
  const threadMessages = useQuery(threadMessages$);
  const activeThreadId = useQuery(activeThreadId$);
  const activeThreadMessages = useQuery(activeThreadMessages$);
  const blueprints = useQuery(blueprints$);

  // Action creators
  const actions = {
    // UI state actions
    setActiveNoteId: useCallback((id: string | null) => {
      store.commit(events.uiStateSet({ 
        activeNoteId: id,
        activeClusterId: activeClusterId || 'cluster-default',
        activeThreadId: activeThreadId,
        graphInitialized: false,
        graphLayout: 'dagre'
      }));
    }, [store, activeClusterId, activeThreadId]),

    setActiveClusterId: useCallback((id: string) => {
      store.commit(events.uiStateSet({ 
        activeNoteId: activeNoteId,
        activeClusterId: id,
        activeThreadId: activeThreadId,
        graphInitialized: false,
        graphLayout: 'dagre'
      }));
    }, [store, activeNoteId, activeThreadId]),

    setActiveThreadId: useCallback((id: string | null) => {
      store.commit(events.uiStateSet({ 
        activeNoteId: activeNoteId,
        activeClusterId: activeClusterId || 'cluster-default',
        activeThreadId: id,
        graphInitialized: false,
        graphLayout: 'dagre'
      }));
    }, [store, activeNoteId, activeClusterId]),

    // Note actions
    createNote: useCallback((note: any, parentId?: string, clusterId?: string) => {
      const id = note.id || generateNoteId();
      const now = new Date().toISOString();
      
      store.commit(events.noteCreated({
        id,
        parentId: parentId || note.parentId || null,
        clusterId: clusterId || note.clusterId || null,
        title: note.title || 'Untitled Note',
        content: note.content || [],
        type: note.type || 'note',
        createdAt: note.createdAt || now,
        updatedAt: note.updatedAt || now,
        path: note.path || null,
        tags: note.tags || null,
        mentions: note.mentions || null
      }));
      
      return id;
    }, [store]),

    updateNote: useCallback((id: string, updates: any) => {
      const now = new Date().toISOString();
      store.commit(events.noteUpdated({
        id,
        updates,
        updatedAt: now
      }));
    }, [store]),

    deleteNote: useCallback((id: string) => {
      store.commit(events.noteDeleted({ id }));
    }, [store]),

    // Cluster actions
    createCluster: useCallback((cluster: any) => {
      const id = cluster.id || generateClusterId();
      const now = new Date().toISOString();
      
      store.commit(events.clusterCreated({
        id,
        title: cluster.title || 'Untitled Cluster',
        createdAt: cluster.createdAt || now,
        updatedAt: cluster.updatedAt || now
      }));
      
      return id;
    }, [store]),

    updateCluster: useCallback((id: string, updates: any) => {
      const now = new Date().toISOString();
      store.commit(events.clusterUpdated({
        id,
        updates,
        updatedAt: now
      }));
    }, [store]),

    deleteCluster: useCallback((id: string) => {
      store.commit(events.clusterDeleted({ id }));
    }, [store]),

    // Thread actions
    createThread: useCallback((thread: any) => {
      const id = thread.id || generateNodeId();
      const now = new Date().toISOString();
      
      store.commit(events.threadCreated({
        id,
        title: thread.title || 'New Thread',
        createdAt: thread.createdAt || now,
        updatedAt: thread.updatedAt || now
      }));
      
      return id;
    }, [store]),

    createThreadMessage: useCallback((message: any) => {
      const id = message.id || generateNodeId();
      const now = new Date().toISOString();
      
      store.commit(events.threadMessageCreated({
        id,
        threadId: message.threadId,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt || now,
        parentId: message.parentId || null
      }));
      
      return id;
    }, [store]),

    updateThreadMessage: useCallback((id: string, updates: any) => {
      store.commit(events.threadMessageUpdated({
        id,
        updates
      }));
    }, [store]),

    deleteThreadMessage: useCallback((id: string) => {
      store.commit(events.threadMessageDeleted({ id }));
    }, [store]),

    // Blueprint actions
    createBlueprint: useCallback((blueprint: any) => {
      const id = blueprint.id || generateNodeId();
      const now = new Date().toISOString();
      
      store.commit(events.blueprintCreated({
        id,
        entityKind: blueprint.entityKind,
        name: blueprint.name,
        description: blueprint.description || null,
        templates: blueprint.templates || [],
        isDefault: blueprint.isDefault || false,
        createdAt: blueprint.createdAt || now,
        updatedAt: blueprint.updatedAt || now
      }));
      
      return id;
    }, [store]),

    updateBlueprint: useCallback((id: string, updates: any) => {
      const now = new Date().toISOString();
      store.commit(events.blueprintUpdated({
        id,
        updates,
        updatedAt: now
      }));
    }, [store]),

    // Entity attributes action
    updateEntityAttributes: useCallback((kind: string, label: string, attributes: any) => {
      const id = `${kind}:${label}`;
      store.commit(events.entityAttributesUpdated({
        id,
        entityKind: kind,
        entityLabel: label,
        attributes: attributes.attributes || attributes,
        metadata: attributes.metadata || { version: 2, lastUpdated: new Date().toISOString() }
      }));
    }, [store])
  };

  return {
    // Data
    notes: Array.isArray(notes) ? notes : [],
    clusters: Array.isArray(clusters) ? clusters : [],
    activeNote: Array.isArray(activeNote) && activeNote.length > 0 ? activeNote[0] : null,
    activeNoteId,
    activeClusterId,
    activeNoteConnections,
    noteTagsMap,
    noteMentionsMap, 
    noteLinksMap,
    noteEntitiesMap,
    noteTriplesMap,
    threads: Array.isArray(threads) ? threads : [],
    threadMessages: Array.isArray(threadMessages) ? threadMessages : [],
    activeThreadId,
    activeThreadMessages: Array.isArray(activeThreadMessages) ? activeThreadMessages : [],
    blueprints: Array.isArray(blueprints) ? blueprints : [],
    
    // Actions
    ...actions,
    
    // Raw store access
    store
  };
}

// Backward compatibility hooks
export function useNotes() {
  const { notes, createNote, updateNote, deleteNote } = useLiveStore();
  return [notes, { createNote, updateNote, deleteNote }] as const;
}

export function useActiveNoteId() {
  const { activeNoteId, setActiveNoteId } = useLiveStore();
  return [activeNoteId, setActiveNoteId] as const;
}

export function useActiveNote() {
  const { activeNote, updateNote } = useLiveStore();
  return [activeNote, updateNote] as const;
}
