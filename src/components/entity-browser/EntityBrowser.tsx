
import React, { useState, useEffect } from 'react';
import { EntityFilters } from './EntityFilters';
import { EntityList } from './EntityList';
import { EntityGrid } from './EntityGrid';
import { EntityDetailPanel } from './EntityDetailPanel';
import { QuickEntryForm } from './QuickEntryForm';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { List, GridIcon } from 'lucide-react';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { useAllEntitiesArray, useEntitiesByType } from '@/hooks/useLiveStore';

export type { EntityWithReferences };
export type ViewMode = 'list' | 'grid';
export type SortOption = 'alpha-asc' | 'alpha-desc' | 'recent' | 'references';

export function EntityBrowser() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedView = localStorage.getItem('entityBrowserViewMode');
    return (savedView === 'list' || savedView === 'grid') ? savedView : 'list';
  });
  
  const [sortOption, setSortOption] = useState<SortOption>('alpha-asc');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<EntityWithReferences | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  
  // Use reactive LiveStore queries
  const entities = useAllEntitiesArray();
  const entitiesByType = useEntitiesByType();
  
  // Save view mode to local storage when it changes
  useEffect(() => {
    localStorage.setItem('entityBrowserViewMode', viewMode);
  }, [viewMode]);
  
  // Filter entities based on current filters and search
  const filteredEntities = entities.filter(entity => {
    // Filter by type if a type filter is selected
    if (filterType && entity.kind !== filterType) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return entity.label.toLowerCase().includes(query) || 
             entity.kind.toLowerCase().includes(query);
    }
    
    return true;
  });
  
  // Sort entities based on current sort option
  const sortedEntities = [...filteredEntities].sort((a, b) => {
    switch (sortOption) {
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
  
  // Get available entity types from the reactive data
  const availableTypes = Array.from(entitiesByType.keys());
  
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center">
        <EntityFilters 
          onFilterChange={setFilterType} 
          onSearchChange={setSearchQuery}
          onSortChange={setSortOption}
          currentFilter={filterType}
          currentSort={sortOption}
          currentSearch={searchQuery}
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
      
      <div className="flex-1 overflow-auto">
        {viewMode === 'list' ? (
          <EntityList 
            entities={sortedEntities} 
            onSelectEntity={handleSelectEntity} 
          />
        ) : (
          <EntityGrid 
            entities={sortedEntities} 
            onSelectEntity={handleSelectEntity} 
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
