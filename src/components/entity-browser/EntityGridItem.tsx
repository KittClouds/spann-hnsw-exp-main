
import React from 'react';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Eye } from 'lucide-react';

interface EntityGridItemProps {
  entity: EntityWithReferences;
  onSelectEntity: (entity: EntityWithReferences) => void;
  style?: React.CSSProperties;
}

export const EntityGridItem = React.memo(({ entity, onSelectEntity, style }: EntityGridItemProps) => {
  const isCharacter = entity.kind === 'CHARACTER';
  const isLocation = entity.kind === 'LOCATION';

  return (
    <div style={style} className="p-2">
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer h-full"
        onClick={() => onSelectEntity(entity)}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg truncate">{entity.label}</CardTitle>
            <Badge
              variant={isCharacter ? "default" : isLocation ? "secondary" : "outline"}
              className="capitalize"
            >
              {entity.kind.toLowerCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2 pt-0">
          <div className="text-sm text-muted-foreground">
            {entity.referenceCount > 0 ? (
              <span>Referenced in {entity.referenceCount} place{entity.referenceCount !== 1 ? 's' : ''}</span>
            ) : (
              <span>Not referenced in any notes</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-1 flex justify-end gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
});

EntityGridItem.displayName = 'EntityGridItem';
