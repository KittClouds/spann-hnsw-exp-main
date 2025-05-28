
import React from 'react';
import { Entity } from '@/lib/utils/parsingUtils';
import { EntityInspectorContent } from './EntityInspectorContent';

interface EntityInspectorProps {
  entity: Entity | null;
  closeDialog?: () => void;
}

export function EntityInspector({ entity }: EntityInspectorProps) {
  return <EntityInspectorContent entity={entity} />;
}
