
import { signal, computed } from '@livestore/livestore';
import { SortOption } from '@/components/entity-browser/EntityBrowser';

// Filter and sort state using signals instead of atoms
export const entityFilters$ = signal({
  search: '',
  type: null as string | null,
  sort: 'alpha-asc' as SortOption
}, { label: 'entityFilters$' });

export const entityPagination$ = signal({
  page: 0,
  size: 100,
  totalPages: 0
}, { label: 'entityPagination$' });

// Debounced search query
export const debouncedSearch$ = computed((get) => {
  const filters = get(entityFilters$);
  return filters.search;
}, { label: 'debouncedSearch$' });
