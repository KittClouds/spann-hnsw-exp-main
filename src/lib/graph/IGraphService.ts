import { Core, CollectionReturnValue, LayoutOptions, ElementDefinition, NodeCollection, Position } from 'cytoscape';
import { Note, Cluster } from '../store';
import { 
    NodeType, EdgeType, CyElementJSON, GraphJSON, GraphData, 
    GraphElementData, Edge, Tag, ChangeListener 
} from './types';

export interface IGraphService {
    // Lifecycle
    // init(container: HTMLElement): void; // Omitted if only headless
    destroy(): void;
    getCy(): Core | null;

    // Data I/O
    importGraph(data: GraphJSON | GraphData): Promise<void>; // Allow GraphJSON for compatibility
    exportGraph(opts?: { includeStyle?: boolean }): GraphJSON; // Return GraphJSON
    exportElement(ele: ElementDefinition | CollectionReturnValue): CyElementJSON; // Match service signature
    importElement(json: CyElementJSON): void;

    // Change Notification
    addChangeListener(listener: (elements: ElementDefinition[]) => void): void; // Match service signature
    removeChangeListener(listener: (elements: ElementDefinition[]) => void): void; // Match service signature

    // Undo/Redo
    undo(): void;
    redo(): void;
    clearUndoStack(): void;

    // Layout & View
    applyLayout(options?: LayoutOptions): void;
    focusNode(nodeId: string): void;
    fitView(elementIds?: string[]): void;

    // Element Access
    getNodes(): Note[];
    getEdges(): Edge[];
    getClusters(): Cluster[];
    getTags(): Tag[];
    getNode(id: string): Note | undefined;
    getEdge(id: string): Edge | undefined;
    getCluster(id: string): Cluster | undefined;
    findElementById(id: string): CollectionReturnValue | undefined;

    // Node Operations
    addNote(noteData: Partial<Note>, folderId?: string, clusterId?: string): Promise<string>;
    updateNote(noteId: string, data: Partial<GraphElementData>): void;
    deleteNote(noteId: string): void;
    moveNode(nodeId: string, newPosition: Position): void;
    moveNodeToParent(nodeId: string, newParentId?: string | null): void;

    // Edge Operations
    addEdge(sourceId: string, targetId: string, data?: Partial<GraphElementData>): Promise<string>;
    updateEdge(edgeId: string, data: Partial<GraphElementData>): void;
    deleteEdge(edgeId: string): void;

    // Cluster Operations
    addCluster(clusterData: Partial<Cluster>): Promise<string>;
    updateCluster(clusterId: string, data: Partial<GraphElementData>): void;
    deleteCluster(clusterId: string): void;
    moveNodeToCluster(nodeId: string, clusterId: string | null): void;
    addNodeToCluster(nodeId: string, clusterId: string): void;
    removeNodeFromCluster(nodeId: string): void;

    // Tag Operations
    tagNote(noteId: string, tagName: string): void;
    untagNote(noteId: string, tagName: string): void;
    getNotesByTag(tagName: string): Note[];

    // Querying & Selection
    searchNodes(query: string, types: NodeType[]): NodeCollection;
    getRelatedNodes(nodeId: string, includeClusters?: boolean): Array<Note | Cluster>;
    getBacklinks(nodeId: string): Array<{id: string; title: string}>;
    getConnections(nodeId: string): Record<'tag' | 'concept' | 'mention', Array<{id: string; title: string}>>;
    selectNode(nodeId: string): void;
    selectEdge(edgeId: string): void;
    selectCluster(clusterId: string): void;
    clearSelection(): void;

    // Utility
    generateId(): string;
    isCluster(elementId: string): boolean;
    isNote(elementId: string): boolean;
    isEdge(elementId: string): boolean;

    // Store Integration
    importFromStore(notes: Note[], clusters: Cluster[]): void;
    exportToStore(): { notes: Note[]; clusters: Cluster[] };
}
