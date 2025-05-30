
import React from 'react';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { EntityDetailContent } from './EntityDetailContent';

interface UniversalEntityDetailPanelProps {
  entity: EntityWithReferences;
  onEntityUpdated?: () => void;
  className?: string;
}

export function UniversalEntityDetailPanel({ 
  entity, 
  onEntityUpdated,
  className = ""
}: UniversalEntityDetailPanelProps) {
  return (
    <EntityDetailContent 
      entity={entity}
      onEntityUpdated={onEntityUpdated}
      className={className}
    />
  );
}
