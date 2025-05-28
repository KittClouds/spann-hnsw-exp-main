
import React from 'react';
import { Entity } from '@/lib/utils/parsingUtils';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EntityInspectorContent } from './EntityInspectorContent';

interface EntityInspectorProps {
  entity: Entity | null;
  closeDialog?: () => void;
}

export function EntityInspector({ entity }: EntityInspectorProps) {
  return (
    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {entity ? entity.label : "No Entity Selected"}
        </DialogTitle>
        <DialogDescription>
          {entity 
            ? `View and edit details for this ${entity.kind} entity.`
            : "Please select an entity to view its details."
          }
        </DialogDescription>
      </DialogHeader>
      
      <EntityInspectorContent entity={entity} />
    </DialogContent>
  );
}
