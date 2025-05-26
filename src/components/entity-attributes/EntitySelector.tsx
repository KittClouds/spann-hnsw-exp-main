
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAtom } from 'jotai';
import { selectedEntityAtom } from '@/lib/rightSidebarStore';
import { useGraph } from '@/contexts/GraphContext';
import { Search } from 'lucide-react';

interface EntitySelectorProps {
  onEntitySelected?: () => void;
}

export function EntitySelector({ onEntitySelected }: EntitySelectorProps) {
  const [selectedEntity, setSelectedEntity] = useAtom(selectedEntityAtom);
  const graph = useGraph();

  // Get all entities using the graph context method
  const getAllEntities = () => {
    if (!graph || !graph.getAllEntities) {
      console.warn('getAllEntities method not available in graph context');
      return [];
    }
    
    try {
      const entities = graph.getAllEntities();
      return entities.map(entity => ({
        kind: entity.kind || 'UNKNOWN',
        label: entity.label || 'Unnamed'
      }));
    } catch (error) {
      console.error('Error getting entities:', error);
      return [];
    }
  };

  const entities = getAllEntities();

  const handleEntitySelect = (entityKey: string) => {
    const [kind, label] = entityKey.split('|');
    setSelectedEntity({ kind, label });
    onEntitySelected?.();
  };

  const clearSelection = () => {
    setSelectedEntity(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Select Entity</h3>
        {selectedEntity && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            className="h-6 px-2 text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      {selectedEntity ? (
        <div className="flex items-center gap-2 p-2 bg-[#12141f] border border-[#1a1b23] rounded">
          <Badge className="capitalize">{selectedEntity.kind.toLowerCase()}</Badge>
          <span className="text-sm text-white">{selectedEntity.label}</span>
        </div>
      ) : (
        <Select onValueChange={handleEntitySelect}>
          <SelectTrigger className="h-8 text-xs bg-[#0a0a0d] border-[#1a1b23]">
            <SelectValue placeholder="Choose an entity..." />
          </SelectTrigger>
          <SelectContent>
            {entities.length > 0 ? (
              entities.map((entity) => (
                <SelectItem 
                  key={`${entity.kind}|${entity.label}`} 
                  value={`${entity.kind}|${entity.label}`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {entity.kind.toLowerCase()}
                    </Badge>
                    <span>{entity.label}</span>
                  </div>
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-entities" disabled>
                No entities found
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}

      {entities.length === 0 && (
        <div className="text-center py-4">
          <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">
            No entities found. Create entities by using [TYPE|Label] syntax in your notes.
          </p>
        </div>
      )}
    </div>
  );
}
