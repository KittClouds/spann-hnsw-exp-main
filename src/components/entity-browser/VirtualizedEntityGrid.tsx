
import React, { useCallback } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { EntityGridItem } from './EntityGridItem';
import { Skeleton } from '@/components/ui/skeleton';

interface VirtualizedEntityGridProps {
  entities: EntityWithReferences[];
  onSelectEntity: (entity: EntityWithReferences) => void;
  hasMore: boolean;
  loadMore: () => void;
  height?: number;
  columnCount?: number;
}

const ITEM_HEIGHT = 200;
const ITEM_WIDTH = 300;

export function VirtualizedEntityGrid({ 
  entities, 
  onSelectEntity,
  hasMore,
  loadMore,
  height = 600,
  columnCount = 4
}: VirtualizedEntityGridProps) {
  const rowCount = Math.ceil(entities.length / columnCount) + (hasMore ? 1 : 0);
  
  const Cell = useCallback(({ 
    columnIndex, 
    rowIndex, 
    style 
  }: { 
    columnIndex: number; 
    rowIndex: number; 
    style: React.CSSProperties;
  }) => {
    const entityIndex = rowIndex * columnCount + columnIndex;
    
    if (entityIndex >= entities.length) {
      if (hasMore && entityIndex === entities.length) {
        // Load more trigger
        loadMore();
        return (
          <div style={style}>
            <Skeleton className="h-48 w-full m-2" />
          </div>
        );
      }
      return <div style={style} />;
    }

    const entity = entities[entityIndex];
    return (
      <EntityGridItem
        entity={entity}
        onSelectEntity={onSelectEntity}
        style={style}
      />
    );
  }, [entities, onSelectEntity, hasMore, loadMore, columnCount]);

  const getColumnWidth = useCallback(() => ITEM_WIDTH, []);
  const getRowHeight = useCallback(() => ITEM_HEIGHT, []);

  if (entities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No entities found. Try adjusting your filters or adding new entities.</p>
      </div>
    );
  }

  return (
    <Grid
      height={height}
      width={1200}
      columnCount={columnCount}
      rowCount={rowCount}
      columnWidth={getColumnWidth}
      rowHeight={getRowHeight}
      overscanRowCount={2}
      overscanColumnCount={1}
    >
      {Cell}
    </Grid>
  );
}
