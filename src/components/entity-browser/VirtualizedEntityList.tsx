
import React, { useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { EntityListItem } from './EntityListItem';
import { Skeleton } from '@/components/ui/skeleton';

interface VirtualizedEntityListProps {
  entities: EntityWithReferences[];
  onSelectEntity: (entity: EntityWithReferences) => void;
  hasMore: boolean;
  loadMore: () => void;
  height?: number;
}

const ITEM_HEIGHT = 72;

export function VirtualizedEntityList({ 
  entities, 
  onSelectEntity,
  hasMore,
  loadMore,
  height = 600 
}: VirtualizedEntityListProps) {
  const itemCount = hasMore ? entities.length + 1 : entities.length;
  const isItemLoaded = useCallback((index: number) => index < entities.length, [entities.length]);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (index >= entities.length) {
      return (
        <div style={style} className="p-3">
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    const entity = entities[index];
    return (
      <EntityListItem
        entity={entity}
        onSelectEntity={onSelectEntity}
        style={style}
      />
    );
  }, [entities, onSelectEntity]);

  if (entities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No entities found. Try adjusting your filters or adding new entities.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadMore}
      >
        {({ onItemsRendered, ref }) => (
          <List
            ref={ref}
            height={height}
            width="100%"
            itemCount={itemCount}
            itemSize={ITEM_HEIGHT}
            onItemsRendered={onItemsRendered}
            overscanCount={5}
          >
            {Row}
          </List>
        )}
      </InfiniteLoader>
    </div>
  );
}
