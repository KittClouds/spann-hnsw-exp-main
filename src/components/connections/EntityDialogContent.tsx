
import React, { useState } from 'react';
import { Entity } from '@/lib/utils/parsingUtils';
import { EntityInspector } from './EntityInspector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface EntityDialogContentProps {
  entity: Entity;
}

export function EntityDialogContent({ entity }: EntityDialogContentProps) {
  const [open, setOpen] = useState(false);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto py-1 px-2">
          View Details
        </Button>
      </DialogTrigger>
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
        
        <EntityInspector entity={entity} />
      </DialogContent>
    </Dialog>
  );
}
