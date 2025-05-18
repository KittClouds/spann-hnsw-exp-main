
import React from 'react';
import { EntityWithReferences } from './EntityBrowser';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Eye } from 'lucide-react';

interface EntityGridProps {
  entities: EntityWithReferences[];
  onSelectEntity: (entity: EntityWithReferences) => void;
}

export function EntityGrid({ entities, onSelectEntity }: EntityGridProps) {
  if (entities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No entities found. Try adjusting your filters or adding new entities.</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {entities.map((entity) => {
        // Determine card style based on entity kind
        const isCharacter = entity.kind === 'CHARACTER';
        const isLocation = entity.kind === 'LOCATION';
        const isItem = entity.kind === 'ITEM';

        return (
          <Card 
            key={`${entity.kind}-${entity.label}`} 
            className="hover:shadow-md transition-shadow cursor-pointer"
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
        );
      })}
    </div>
  );
}
