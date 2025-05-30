
import React, { useState, useEffect, useMemo } from 'react';
import { EntityFilters } from './EntityFilters';
import { VirtualizedEntityList } from './VirtualizedEntityList';
import { VirtualizedEntityGrid } from './VirtualizedEntityGrid';
import { EntityDetailPanel } from './EntityDetailPanel';
import { QuickEntryForm } from './QuickEntryForm';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { List, GridIcon } from 'lucide-react';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { useVirtualizedEntities } from '@/hooks/useVirtualizedEntities';

export type { EntityWithReferences };
export type ViewMode = 'list' | 'grid';
export type SortOption = 'alpha-asc' | 'alpha-desc' | 'recent' | 'references';

export function EntityBrowser() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedView = localStorage.getItem('entityBrowserViewMode');
    return (savedView === 'list' || savedView === 'grid') ? savedView : 'list';
  });
  
  const [selectedEntity, setSelectedEntity] = useState<EntityWithReferences | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  
  // Use the new virtualized entities hook
  const {
    entities,
    filteredTotal,
    hasMore,
    availableTypes,
    filters,
    updateFilters,
    loadMore
  } = useVirtualizedEntities();
  
  // Save view mode to local storage when it changes
  useEffect(() => {
    localStorage.setItem('entityBrowserViewMode', viewMode);
  }, [viewMode]);
  
  // Handle entity selection
  const handleSelectEntity = (entity: EntityWithReferences) => {
    setSelectedEntity(entity);
    setIsDetailOpen(true);
  };
  
  // Handle entity creation from quick entry form
  const handleEntityCreated = () => {
    setIsQuickEntryOpen(false);
    // Entities will automatically update via reactive queries
  };
  
  // Filter handlers
  const handleFilterChange = (type: string | null) => {
    updateFilters({ type });
  };

  const handleSearchChange = (search: string) => {
    updateFilters({ search });
  };

  const handleSortChange = (sort: SortOption) => {
    updateFilters({ sort });
  };
  
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center">
        <EntityFilters 
          onFilterChange={handleFilterChange}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
          currentFilter={filters.type}
          currentSort={filters.sort}
          currentSearch={filters.search}
          availableTypes={availableTypes}
        />
        
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ViewMode)}>
            <ToggleGroupItem value="list" aria-label="List View">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid View">
              <GridIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          <Dialog open={isQuickEntryOpen} onOpenChange={setIsQuickEntryOpen}>
            <DialogTrigger asChild>
              <Button className="ml-2">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Entity
              </Button>
            </DialogTrigger>
            <QuickEntryForm onEntityCreated={handleEntityCreated} />
          </Dialog>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground mb-2">
        Showing {entities.length} of {filteredTotal} entities
        {hasMore && " (loading more...)"}
      </div>
      
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <VirtualizedEntityList 
            entities={entities} 
            onSelectEntity={handleSelectEntity}
            hasMore={hasMore}
            loadMore={loadMore}
            height={600}
          />
        ) : (
          <VirtualizedEntityGrid 
            entities={entities} 
            onSelectEntity={handleSelectEntity}
            hasMore={hasMore}
            loadMore={loadMore}
            height={600}
            columnCount={4}
          />
        )}
      </div>
      
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {selectedEntity && (
          <EntityDetailPanel 
            entity={selectedEntity}
            onClose={() => setIsDetailOpen(false)} 
            onEntityUpdated={() => {
              // Entities will automatically update via reactive queries
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
