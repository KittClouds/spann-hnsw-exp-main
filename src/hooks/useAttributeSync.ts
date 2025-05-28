
import { useEffect, useCallback } from 'react';
import { useGraph } from '@/contexts/GraphContext';
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
  const { getEntityAttributes, updateEntityAttributes } = useGraph();

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
          updateEntityAttributes(entityKind, entityLabel, enhancedAttrs);
        }, 300);
      };
    })(),
    [entityKind, entityLabel, updateEntityAttributes]
  );

  // Save attributes when they change
  useEffect(() => {
    if (attributes.length > 0) {
      debouncedSave(attributes);
    }
  }, [attributes, debouncedSave]);

  // Load attributes from graph when entity changes
  const loadAttributes = useCallback(() => {
    const existingAttrs = getEntityAttributes(entityKind, entityLabel);
    if (existingAttrs) {
      if (existingAttrs.attributes && Array.isArray(existingAttrs.attributes)) {
        return existingAttrs.attributes;
      } else {
        // Migrate old format
        return Object.entries(existingAttrs).map(([key, value]) => ({
          id: `migrated-${key}-${Date.now()}`,
          name: key,
          type: 'Text' as const,
          value: String(value),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      }
    }
    return [];
  }, [entityKind, entityLabel, getEntityAttributes]);

  return {
    loadAttributes,
    saveAttributes: debouncedSave
  };
}
