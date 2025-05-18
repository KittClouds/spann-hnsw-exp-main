
import React from 'react';
import { EntityWithReferences } from './EntityBrowser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Eye } from 'lucide-react';

interface EntityListProps {
  entities: EntityWithReferences[];
  onSelectEntity: (entity: EntityWithReferences) => void;
}

export function EntityList({ entities, onSelectEntity }: EntityListProps) {
  if (entities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No entities found. Try adjusting your filters or adding new entities.</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Entity</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>References</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => (
            <TableRow key={`${entity.kind}-${entity.label}`}>
              <TableCell className="font-medium">{entity.label}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {entity.kind.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell>{entity.referenceCount}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSelectEntity(entity)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSelectEntity(entity)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
