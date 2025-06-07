
import { useStore } from '@livestore/react';
import { queryDb } from '@livestore/livestore';
import { tables } from '../livestore/schema';
import { spannSearchService } from '@/lib/embedding/SpannSearchService';
import { useEffect } from 'react';

// Query for all embeddings
const embeddings$ = queryDb(
  () => tables.embeddings.select(),
  { label: 'embeddings' }
);

// Query for embedding count
const embeddingCount$ = queryDb(
  () => tables.embeddings.count(),
  { label: 'embeddingCount' }
);

// Query for embedding clusters count
const embeddingClustersCount$ = queryDb(
  () => tables.embeddingClusters.count(),
  { label: 'embeddingClustersCount' }
);

// Reactive hook for embeddings data
export function useEmbeddings() {
  const { store } = useStore();
  const embeddings = store.useQuery(embeddings$);
  
  // Inject store reference into SPANN search service
  useEffect(() => {
    spannSearchService.setStore(store);
  }, [store]);
  
  return Array.isArray(embeddings) ? embeddings : [];
}

// Hook for embedding count
export function useEmbeddingCount() {
  const { store } = useStore();
  return store.useQuery(embeddingCount$) || 0;
}

// Hook for embedding clusters count
export function useEmbeddingClustersCount() {
  const { store } = useStore();
  return store.useQuery(embeddingClustersCount$) || 0;
}

// Hook for paginated embeddings
export function usePaginatedEmbeddings(limit: number = 50, page: number = 0) {
  const { store } = useStore();
  
  const paginatedEmbeddings$ = queryDb(
    () => tables.embeddings
      .select('noteId', 'title', 'createdAt', 'updatedAt', 'clusterId')
      .orderBy('updatedAt', 'desc')
      .limit(limit),
    { 
      label: 'paginatedEmbeddings',
      deps: [limit, page]
    }
  );
  
  const embeddings = store.useQuery(paginatedEmbeddings$);
  return Array.isArray(embeddings) ? embeddings : [];
}
