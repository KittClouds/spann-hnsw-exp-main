import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plus, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraph } from '@/contexts/GraphContext';
import { Entity } from '@/lib/utils/parsingUtils';
import { ClusterEntity } from './useActiveClusterEntities';

interface EntityCardProps {
  entity: Entity | ClusterEntity;
  viewMode: 'note' | 'cluster';
}

export function EntityCard({ entity, viewMode }: EntityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const { getEntityAttributes, updateEntityAttributes } = useGraph();

  React.useEffect(() => {
    const existingAttrs = getEntityAttributes(entity.kind, entity.label);
    if (existingAttrs) {
      setAttributes(existingAttrs);
    }
  }, [entity.kind, entity.label, getEntityAttributes]);

  const handleAddAttribute = () => {
    if (newAttrKey.trim() && newAttrValue.trim()) {
      const newAttributes = {
        ...attributes,
        [newAttrKey.trim()]: newAttrValue.trim()
      };
      setAttributes(newAttributes);
      updateEntityAttributes(entity.kind, entity.label, newAttributes);
      setNewAttrKey('');
      setNewAttrValue('');
    }
  };

  const handleRemoveAttribute = (key: string) => {
    const newAttributes = { ...attributes };
    delete newAttributes[key];
    setAttributes(newAttributes);
    updateEntityAttributes(entity.kind, entity.label, newAttributes);
  };

  const handleAttributeChange = (key: string, value: string) => {
    const newAttributes = {
      ...attributes,
      [key]: value
    };
    setAttributes(newAttributes);
    updateEntityAttributes(entity.kind, entity.label, newAttributes);
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

                {/* Attributes */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Attributes:
                  </h4>
                  
                  {/* Existing Attributes */}
                  <div className="space-y-2">
                    {Object.entries(attributes).map(([key, value]) => (
                      <div key={key} className="flex gap-2 items-center">
                        <Input
                          value={key}
                          readOnly
                          className="h-7 text-xs bg-[#12141f] border-[#1a1b23] flex-1"
                        />
                        <Input
                          value={value}
                          onChange={(e) => handleAttributeChange(key, e.target.value)}
                          className="h-7 text-xs bg-[#12141f] border-[#1a1b23] flex-2"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAttribute(key)}
                          className="h-7 w-7 hover:bg-red-900/20 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Attribute */}
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      placeholder="Key"
                      value={newAttrKey}
                      onChange={(e) => setNewAttrKey(e.target.value)}
                      className="h-7 text-xs bg-[#12141f] border-[#1a1b23] flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={newAttrValue}
                      onChange={(e) => setNewAttrValue(e.target.value)}
                      className="h-7 text-xs bg-[#12141f] border-[#1a1b23] flex-2"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleAddAttribute}
                      disabled={!newAttrKey.trim() || !newAttrValue.trim()}
                      className="h-7 w-7 hover:bg-green-900/20 hover:text-green-400"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
