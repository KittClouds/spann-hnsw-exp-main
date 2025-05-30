
import { atom, computed } from '@livestore/livestore';
import { SortOption } from '@/components/entity-browser/EntityBrowser';

// Filter and sort state atoms
export const entityFilters$ = atom({
  search: '',
  type: null as string | null,
  sort: 'alpha-asc' as SortOption
});

export const entityPagination$ = atom({
  page: 0,
  size: 100,
  totalPages: 0
});

// Debounced search query
export const debouncedSearch$ = computed((get) => {
  const filters = get(entityFilters$);
  return filters.search;
}, { label: 'debouncedSearch$' });
