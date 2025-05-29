import { queryDb, computed } from '@livestore/livestore';
import { tables } from './schema';
import { parseAllNotes } from '@/lib/utils/parsingUtils';
import { parseNoteConnectionsFromDocument } from '@/lib/utils/documentParser';

// Basic entity queries with proper typing
export const clusters$ = queryDb(
  tables.clusters.orderBy('createdAt', 'desc'),
  { label: 'clusters$' }
);

export const notes$ = queryDb(
  tables.notes.orderBy('createdAt', 'desc'),
  { label: 'notes$' }
);

export const threads$ = queryDb(
  tables.threads.orderBy('createdAt', 'desc'),
  { label: 'threads$' }
);

export const threadMessages$ = queryDb(
  tables.threadMessages.orderBy('createdAt', 'asc'),
  { label: 'threadMessages$' }
);

export const blueprints$ = queryDb(
  tables.blueprints.orderBy('createdAt', 'desc'),
  { label: 'blueprints$' }
);

export const entityAttributes$ = queryDb(
  tables.entityAttributes.orderBy('entityKind', 'asc'),
  { label: 'entityAttributes$' }
);

// UI state queries - use the client document pattern correctly
export const uiState$ = computed((get) => {
  // For client documents, we need to query the table and get the first result
  const results = get(queryDb(tables.uiState, { label: 'uiStateRaw$' }));
  return Array.isArray(results) && results.length > 0 ? results[0].value : {
    activeNoteId: null,
    activeClusterId: 'cluster-default',
    activeThreadId: null,
    graphInitialized: false,
    graphLayout: 'dagre'
  };
}, { label: 'uiState$' });

export const activeNoteId$ = computed((get) => {
  const ui = get(uiState$);
  return ui?.activeNoteId || null;
}, { label: 'activeNoteId$' });

export const activeClusterId$ = computed((get) => {
  const ui = get(uiState$);
  return ui?.activeClusterId || 'cluster-default';
}, { label: 'activeClusterId$' });

export const activeThreadId$ = computed((get) => {
  const ui = get(uiState$);
  return ui?.activeThreadId || null;
}, { label: 'activeThreadId$' });

// Filtered queries
export const activeClusterNotes$ = queryDb((get) => {
  const activeClusterId = get(activeClusterId$);
  return tables.notes.where({ clusterId: activeClusterId }).orderBy('createdAt', 'desc');
}, { label: 'activeClusterNotes$' });

export const standardNotes$ = queryDb(
  tables.notes.where({ clusterId: null }).orderBy('createdAt', 'desc'),
  { label: 'standardNotes$' }
);

export const activeNote$ = computed((get) => {
  const activeId = get(activeNoteId$);
  const allNotes = get(notes$);
  if (!activeId || !Array.isArray(allNotes)) return null;
  return allNotes.find((note: any) => note.id === activeId) || null;
}, { label: 'activeNote$' });

export const activeThreadMessages$ = queryDb((get) => {
  const activeThreadId = get(activeThreadId$);
  if (!activeThreadId) return tables.threadMessages.where({ threadId: '__nonexistent__' });
  return tables.threadMessages.where({ threadId: activeThreadId }).orderBy('createdAt', 'asc');
}, { label: 'activeThreadMessages$' });

// Legacy parsing for backward compatibility
export const noteConnections$ = computed((get) => {
  const notes = get(notes$);
  if (!Array.isArray(notes)) {
    return {
      tagsMap: new Map(),
      mentionsMap: new Map(),
      linksMap: new Map(),
      entitiesMap: new Map(),
      triplesMap: new Map()
    };
  }
  console.log("LiveStore: Recalculating all parsed connections (legacy)");
  return parseAllNotes(notes);
}, { label: 'noteConnections$' });

export const noteTagsMap$ = computed((get) => {
  return get(noteConnections$).tagsMap;
}, { label: 'noteTagsMap$' });

export const noteMentionsMap$ = computed((get) => {
  return get(noteConnections$).mentionsMap;
}, { label: 'noteMentionsMap$' });

export const noteLinksMap$ = computed((get) => {
  return get(noteConnections$).linksMap;
}, { label: 'noteLinksMap$' });

export const noteEntitiesMap$ = computed((get) => {
  return get(noteConnections$).entitiesMap;
}, { label: 'noteEntitiesMap$' });

export const noteTriplesMap$ = computed((get) => {
  return get(noteConnections$).triplesMap;
}, { label: 'noteTriplesMap$' });

// New document-based parsing for canonical data
export const activeNoteConnections$ = computed((get) => {
  const activeNote = get(activeNote$);
  if (!activeNote || !activeNote.content) {
    return { tags: [], mentions: [], links: [], entities: [], triples: [] };
  }

  // Use document-based parsing for canonical data
  console.log("LiveStore: Parsing active note connections from document structure");
  const connections = parseNoteConnectionsFromDocument(activeNote.content);
  
  return {
    tags: connections.tags,
    mentions: connections.mentions,
    links: connections.links,
    entities: connections.entities,
    triples: connections.triples
  };
}, { label: 'activeNoteConnections$' });
