
import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { selectedEntityAtom, entityDisplayModeAtom } from '@/lib/rightSidebarStore';
import { useGraph } from '@/contexts/GraphContext';
import { EntitySelector } from './EntitySelector';
import { ResourceBar } from './ResourceBar';
import { StatBlock } from './StatBlock';
import { AttributeEditor } from '../entity-manager/AttributeEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Eye, Grid3X3 } from 'lucide-react';
import { EnhancedTypedAttribute, EnhancedAttributeType, ResourceAttribute, StatBlockAttribute } from '@/types/enhancedAttributes';
import { TypedAttribute } from '@/types/attributes';

export function EntityAttributeDisplay() {
  const [selectedEntity] = useAtom(selectedEntityAtom);
  const [displayMode, setDisplayMode] = useAtom(entityDisplayModeAtom);
  const [attributes, setAttributes] = useState<EnhancedTypedAttribute[]>([]);
  const graph = useGraph();

  useEffect(() => {
    if (selectedEntity && graph) {
      const entityAttributes = graph.getEntityAttributes(selectedEntity.kind, selectedEntity.label) || {};
      
      // Convert stored attributes to EnhancedTypedAttribute format
      const attributesList: EnhancedTypedAttribute[] = Object.entries(entityAttributes).map(([name, value]) => ({
        id: `${selectedEntity.kind}-${selectedEntity.label}-${name}`,
        name,
        type: inferAttributeType(value) as EnhancedAttributeType,
        value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      setAttributes(attributesList);
    } else {
      setAttributes([]);
    }
  }, [selectedEntity, graph]);

  const inferAttributeType = (value: any): EnhancedAttributeType => {
    if (typeof value === 'string') return 'Text';
    if (typeof value === 'number') return 'Number';
    if (typeof value === 'boolean') return 'Boolean';
    if (Array.isArray(value)) return 'List';
    if (value && typeof value === 'object') {
      if ('current' in value && 'max' in value) return 'Resource';
      if ('category' in value && 'stats' in value) return 'StatBlock';
    }
    return 'Text';
  };

  const handleAttributesChange = (newAttributes: EnhancedTypedAttribute[]) => {
    setAttributes(newAttributes);
    
    if (selectedEntity && graph) {
      const attributesObject = newAttributes.reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {} as Record<string, any>);
      
      graph.updateEntityAttributes(selectedEntity.kind, selectedEntity.label, attributesObject);
    }
  };

  const categorizeAttributes = () => {
    const categories = {
      resources: attributes.filter(attr => attr.type === 'Resource'),
      stats: attributes.filter(attr => attr.type === 'StatBlock'),
      basic: attributes.filter(attr => !['Resource', 'StatBlock'].includes(attr.type)),
    };
    return categories;
  };

  const renderResourceAttributes = (resourceAttrs: EnhancedTypedAttribute[]) => (
    <div className="space-y-3">
      {resourceAttrs.map(attr => (
        <ResourceBar
          key={attr.id}
          name={attr.name}
          resource={attr.value as ResourceAttribute}
          onChange={(newResource) => {
            const updatedAttrs = attributes.map(a => 
              a.id === attr.id ? { ...a, value: newResource } : a
            );
            handleAttributesChange(updatedAttrs);
          }}
        />
      ))}
    </div>
  );

  const renderStatBlocks = (statAttrs: EnhancedTypedAttribute[]) => (
    <div className="space-y-3">
      {statAttrs.map(attr => (
        <StatBlock
          key={attr.id}
          name={attr.name}
          statBlock={attr.value as StatBlockAttribute}
          onChange={(newStatBlock) => {
            const updatedAttrs = attributes.map(a => 
              a.id === attr.id ? { ...a, value: newStatBlock } : a
            );
            handleAttributesChange(updatedAttrs);
          }}
        />
      ))}
    </div>
  );

  // Convert enhanced attributes to base TypedAttribute for AttributeEditor
  const convertToBasicAttributes = (attrs: EnhancedTypedAttribute[]): TypedAttribute[] => {
    return attrs.map(attr => ({
      id: attr.id,
      name: attr.name,
      type: attr.type === 'Resource' || attr.type === 'StatBlock' ? 'Text' : attr.type,
      value: typeof attr.value === 'object' ? JSON.stringify(attr.value) : attr.value,
      unit: attr.unit,
      createdAt: attr.createdAt,
      updatedAt: attr.updatedAt
    }));
  };

  const convertFromBasicAttributes = (basicAttrs: TypedAttribute[], existingAttrs: EnhancedTypedAttribute[]): EnhancedTypedAttribute[] => {
    return basicAttrs.map(attr => {
      const existing = existingAttrs.find(e => e.id === attr.id);
      return {
        ...attr,
        type: existing?.type || (attr.type as EnhancedAttributeType),
        value: existing?.value || attr.value
      } as EnhancedTypedAttribute;
    });
  };

  if (!selectedEntity) {
    return (
      <div className="p-4">
        <EntitySelector />
      </div>
    );
  }

  const categories = categorizeAttributes();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1b23]">
        <EntitySelector />
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Badge className="capitalize">{selectedEntity.kind.toLowerCase()}</Badge>
            <span className="text-sm font-medium text-white">{selectedEntity.label}</span>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={displayMode === 'compact' ? 'secondary' : 'ghost'}
              onClick={() => setDisplayMode('compact')}
              className="h-6 w-6 p-0"
            >
              <Grid3X3 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={displayMode === 'detailed' ? 'secondary' : 'ghost'}
              onClick={() => setDisplayMode('detailed')}
              className="h-6 w-6 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {displayMode === 'categories' ? (
            <Tabs defaultValue="resources" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="basic">Basic</TabsTrigger>
              </TabsList>
              
              <TabsContent value="resources">
                {categories.resources.length > 0 ? (
                  renderResourceAttributes(categories.resources)
                ) : (
                  <p className="text-xs text-muted-foreground text-center">No resource attributes</p>
                )}
              </TabsContent>
              
              <TabsContent value="stats">
                {categories.stats.length > 0 ? (
                  renderStatBlocks(categories.stats)
                ) : (
                  <p className="text-xs text-muted-foreground text-center">No stat blocks</p>
                )}
              </TabsContent>
              
              <TabsContent value="basic">
                <AttributeEditor
                  attributes={convertToBasicAttributes(categories.basic)}
                  onAttributesChange={(newBasicAttrs) => {
                    const convertedBasic = convertFromBasicAttributes(newBasicAttrs, categories.basic);
                    const updatedAttrs = [
                      ...categories.resources,
                      ...categories.stats,
                      ...convertedBasic
                    ];
                    handleAttributesChange(updatedAttrs);
                  }}
                  entityKind={selectedEntity.kind}
                  entityLabel={selectedEntity.label}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              {/* Resources Section */}
              {categories.resources.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Resources
                  </h4>
                  {renderResourceAttributes(categories.resources)}
                </div>
              )}
              
              {/* Stats Section */}
              {categories.stats.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Stats
                  </h4>
                  {renderStatBlocks(categories.stats)}
                </div>
              )}
              
              {/* Basic Attributes */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Attributes
                </h4>
                <AttributeEditor
                  attributes={convertToBasicAttributes(categories.basic)}
                  onAttributesChange={(newBasicAttrs) => {
                    const convertedBasic = convertFromBasicAttributes(newBasicAttrs, categories.basic);
                    const updatedAttrs = [
                      ...categories.resources,
                      ...categories.stats,
                      ...convertedBasic
                    ];
                    handleAttributesChange(updatedAttrs);
                  }}
                  entityKind={selectedEntity.kind}
                  entityLabel={selectedEntity.label}
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
