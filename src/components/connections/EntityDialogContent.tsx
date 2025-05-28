
import React, { useState } from 'react';
import { Entity } from '@/lib/utils/parsingUtils';
import { EntityInspector } from './EntityInspector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';

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
      <EntityInspector entity={entity} />
    </Dialog>
  );
}
