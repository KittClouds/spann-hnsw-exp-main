
import { useMemo, useCallback } from 'react';
import { useStore } from '@livestore/react';
import { allEntitiesArray$, entitiesByType$ } from '@/livestore/queries/entities';
import { entityFilters$, entityPagination$ } from '@/livestore/queries/entityFilters';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { SortOption } from '@/components/entity-browser/EntityBrowser';

export function useVirtualizedEntities() {
  const { store } = useStore();
  
  // Get reactive data
  const allEntities = store.useQuery(allEntitiesArray$);
  const entitiesByType = store.useQuery(entitiesByType$);
  const filters = store.useQuery(entityFilters$);
  const pagination = store.useQuery(entityPagination$);

  // Filter entities
  const filteredEntities = useMemo(() => {
    let filtered = allEntities;

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(entity => entity.kind === filters.type);
    }

    // Filter by search query
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(entity => 
        entity.label.toLowerCase().includes(query) || 
        entity.kind.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allEntities, filters.type, filters.search]);

  // Sort entities
  const sortedEntities = useMemo(() => {
    return [...filteredEntities].sort((a, b) => {
      switch (filters.sort) {
        case 'alpha-asc':
          return a.label.localeCompare(b.label);
        case 'alpha-desc':
          return b.label.localeCompare(a.label);
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'references':
          return b.referenceCount - a.referenceCount;
        default:
          return 0;
      }
    });
  }, [filteredEntities, filters.sort]);

  // Paginate entities
  const paginatedData = useMemo(() => {
    const start = pagination.page * pagination.size;
    const end = start + pagination.size;
    
    return {
      items: sortedEntities.slice(0, end), // Load progressively
      total: sortedEntities.length,
      hasMore: end < sortedEntities.length,
      currentPage: pagination.page
    };
  }, [sortedEntities, pagination.page, pagination.size]);

  // Action creators
  const updateFilters = useCallback((updates: Partial<typeof filters>) => {
    store.setSignal(entityFilters$, { ...filters, ...updates });
  }, [store, filters]);

  const updatePagination = useCallback((updates: Partial<typeof pagination>) => {
    store.setSignal(entityPagination$, { ...pagination, ...updates });
  }, [store, pagination]);

  const loadMore = useCallback(() => {
    if (paginatedData.hasMore) {
      updatePagination({ page: pagination.page + 1 });
    }
  }, [pagination.page, paginatedData.hasMore, updatePagination]);

  return {
    entities: paginatedData.items,
    filteredTotal: sortedEntities.length,
    hasMore: paginatedData.hasMore,
    isLoading: false, // Could be enhanced with actual loading states
    availableTypes: Array.from(entitiesByType.keys()),
    filters,
    updateFilters,
    loadMore
  };
}
