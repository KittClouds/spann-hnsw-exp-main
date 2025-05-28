
import { useEffect, useCallback } from 'react';
import { useStore } from '@livestore/react';
import { events } from '../livestore/schema';
import { TypedAttribute, EnhancedEntityAttributes } from '@/types/attributes';

interface UseAttributeSyncProps {
  entityKind: string;
  entityLabel: string;
  attributes: TypedAttribute[];
  onAttributesChange: (attributes: TypedAttribute[]) => void;
}

export function useAttributeSync({
  entityKind,
  entityLabel,
  attributes,
  onAttributesChange
}: UseAttributeSyncProps) {
  const { store } = useStore();

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (newAttributes: TypedAttribute[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const enhancedAttrs: EnhancedEntityAttributes = {
            attributes: newAttributes,
            metadata: {
              version: 2,
              lastUpdated: new Date().toISOString()
            }
          };
          
          const id = `${entityKind}:${entityLabel}`;
          store.commit(events.entityAttributesUpdated({
            id,
            entityKind,
            entityLabel,
            attributes: enhancedAttrs.attributes,
            metadata: enhancedAttrs.metadata
          }));
        }, 300);
      };
    })(),
    [entityKind, entityLabel, store]
  );

  // Save attributes when they change
  useEffect(() => {
    if (attributes.length > 0) {
      debouncedSave(attributes);
    }
  }, [attributes, debouncedSave]);

  // Load attributes function - this would need to be connected to a query
  const loadAttributes = useCallback(() => {
    // For now, return empty array - this would be replaced with a proper query
    // The component should use useQuery to get entity attributes directly
    console.warn('loadAttributes called - this should be replaced with direct useQuery usage');
    return [];
  }, []);

  return {
    loadAttributes,
    saveAttributes: debouncedSave
  };
}
