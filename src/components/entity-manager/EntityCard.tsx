import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraph } from '@/contexts/GraphContext';
import { Entity } from '@/lib/utils/parsingUtils';
import { ClusterEntity } from './useActiveClusterEntities';
import { AttributeEditor } from './AttributeEditor';
import { TypedAttribute, EnhancedEntityAttributes } from '@/types/attributes';
import { useAtom } from 'jotai';
import { blueprintsAtom } from '@/lib/store';

interface EntityCardProps {
  entity: Entity | ClusterEntity;
  viewMode: 'note' | 'cluster';
}

export function EntityCard({ entity, viewMode }: EntityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [attributes, setAttributes] = useState<TypedAttribute[]>([]);
  const [blueprints] = useAtom(blueprintsAtom);
  const { getEntityAttributes, updateEntityAttributes } = useGraph();

  React.useEffect(() => {
    const existingAttrs = getEntityAttributes(entity.kind, entity.label);
    if (existingAttrs) {
      // Check if we have the new enhanced format
      if (existingAttrs.attributes && Array.isArray(existingAttrs.attributes)) {
        setAttributes(existingAttrs.attributes);
      } else {
        // Migrate old format to new format
        const migratedAttrs: TypedAttribute[] = Object.entries(existingAttrs).map(([key, value]) => ({
          id: `migrated-${key}-${Date.now()}`,
          name: key,
          type: 'Text' as const,
          value: String(value),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        setAttributes(migratedAttrs);
        // Save the migrated format
        handleAttributesChange(migratedAttrs);
      }
    }
  }, [entity.kind, entity.label, getEntityAttributes]);

  const handleAttributesChange = (newAttributes: TypedAttribute[]) => {
    setAttributes(newAttributes);
    
    const enhancedAttrs: EnhancedEntityAttributes = {
      attributes: newAttributes,
      metadata: {
        version: 2,
        lastUpdated: new Date().toISOString()
      }
    };
    
    updateEntityAttributes(entity.kind, entity.label, enhancedAttrs);
  };

  const isClusterEntity = 'sourceNoteIds' in entity;

  return (
    <Card className="bg-[#1a1b23] border-[#22242f]">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-[#22242f] rounded-none text-left"
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-white">{entity.label}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {entity.kind.toLowerCase()}
            </Badge>
            {isClusterEntity && (
              <Badge variant="outline" className="text-xs">
                {entity.referenceCount} refs
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0 space-y-3">
                {/* Source Notes (for cluster view) */}
                {viewMode === 'cluster' && isClusterEntity && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      Found in notes:
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {entity.sourceNoteIds.map(noteId => (
                        <Badge
                          key={noteId}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-[#2a2d3a]"
                        >
                          <ExternalLink className="h-2 w-2 mr-1" />
                          Note
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced Attributes */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Attributes:
                  </h4>
                  
                  <AttributeEditor
                    attributes={attributes}
                    onAttributesChange={handleAttributesChange}
                    entityKind={entity.kind}
                    entityLabel={entity.label}
                    availableBlueprints={blueprints}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
