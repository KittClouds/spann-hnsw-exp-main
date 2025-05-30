
import React from 'react';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EntityDetailContent } from './EntityDetailContent';

interface EntityDetailModalProps {
  entity: EntityWithReferences | null;
  open: boolean;
  onClose: () => void;
  onEntityUpdated?: () => void;
}

export function EntityDetailModal({ 
  entity, 
  open, 
  onClose, 
  onEntityUpdated 
}: EntityDetailModalProps) {
  if (!entity) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{entity.label}</span>
            <Badge className="ml-2 capitalize">{entity.kind.toLowerCase()}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="h-[400px] overflow-hidden">
          <EntityDetailContent 
            entity={entity}
            onEntityUpdated={onEntityUpdated}
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
