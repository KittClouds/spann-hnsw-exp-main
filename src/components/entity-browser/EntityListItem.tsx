
import React from 'react';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Sidebar } from 'lucide-react';
import { useEntitySelection } from '@/hooks/useEntitySelection';

interface EntityListItemProps {
  entity: EntityWithReferences;
  onSelectEntity: (entity: EntityWithReferences) => void;
  style?: React.CSSProperties;
}

export const EntityListItem = React.memo(({ entity, onSelectEntity, style }: EntityListItemProps) => {
  const { selectEntity } = useEntitySelection();

  const handleViewInSidebar = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectEntity(entity, 'sidebar');
  };

  return (
    <div style={style} className="flex items-center justify-between p-3 border-b border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-medium truncate">{entity.label}</span>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize text-xs">
              {entity.kind.toLowerCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {entity.referenceCount} references
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSelectEntity(entity)}
          title="View in modal"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleViewInSidebar}
          title="View in sidebar"
        >
          <Sidebar className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSelectEntity(entity)}
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

EntityListItem.displayName = 'EntityListItem';
