
import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { activeNoteConnectionsAtom, activeClusterIdAtom } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileText, FolderOpen } from 'lucide-react';
import { EntityTypeGroup } from './EntityTypeGroup';
import { useActiveClusterEntities } from './useActiveClusterEntities';

type ViewMode = 'note' | 'cluster';

export function EntityManagerContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('note');
  const [searchQuery, setSearchQuery] = useState('');
  const [{ entities: noteEntities }] = useAtom(activeNoteConnectionsAtom);
  const [activeClusterId] = useAtom(activeClusterIdAtom);
  const clusterEntities = useActiveClusterEntities();

  const entities = viewMode === 'note' ? noteEntities : clusterEntities;

  // Group entities by kind
  const entityGroups = React.useMemo(() => {
    const groups: Record<string, typeof entities> = {};
    
    entities.forEach(entity => {
      if (!groups[entity.kind]) {
        groups[entity.kind] = [];
      }
      groups[entity.kind].push(entity);
    });
    
    // Filter by search query if provided
    if (searchQuery) {
      Object.keys(groups).forEach(kind => {
        groups[kind] = groups[kind].filter(entity => 
          entity.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (groups[kind].length === 0) {
          delete groups[kind];
        }
      });
    }
    
    return groups;
  }, [entities, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* View Mode Toggle */}
      <div className="p-4 border-b border-[#1a1b23]">
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewMode === 'note' ? 'default' : 'ghost'}
            onClick={() => setViewMode('note')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Current Note
          </Button>
          <Button
            variant={viewMode === 'cluster' ? 'default' : 'ghost'}
            onClick={() => setViewMode('cluster')}
            className="flex items-center gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Current Cluster
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search entities..."
            className="pl-8 bg-[#12141f] border-[#1a1b23]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Entity Groups */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {Object.keys(entityGroups).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No entities found {viewMode === 'note' ? 'in this note' : 'in this cluster'}.</p>
            <p className="mt-2 text-sm">
              Use <code className="bg-muted px-1 rounded">[TYPE|Label]</code> syntax to create entities.
            </p>
          </div>
        ) : (
          Object.entries(entityGroups).map(([kind, entityList]) => (
            <EntityTypeGroup
              key={kind}
              kind={kind}
              entities={entityList}
              viewMode={viewMode}
            />
          ))
        )}
      </div>
    </div>
  );
}
