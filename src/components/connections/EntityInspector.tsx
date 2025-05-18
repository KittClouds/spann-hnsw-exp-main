
import React, { useState, useEffect } from 'react';
import { Entity } from '@/lib/utils/parsingUtils';
import { schema } from '@/lib/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EntityAttributesForm } from './EntityAttributesForm';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGraph } from '@/contexts/GraphContext';
import { graphContextExtensionMethods } from '@/contexts/GraphContextExtension';

interface EntityInspectorProps {
  entity: Entity;
  closeDialog?: () => void;
}

export function EntityInspector({ entity, closeDialog }: EntityInspectorProps) {
  const { kind, label } = entity;
  const [activeTab, setActiveTab] = useState("info");
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const graph = useGraph();
  const { updateEntityAttributes } = graphContextExtensionMethods;
  
  useEffect(() => {
    // Load attributes when component mounts
    const existingAttributes = graph.getEntityAttributes?.(kind, label) || {};
    setAttributes(existingAttributes);
  }, [kind, label, graph]);
  
  const nodeDef = schema.getNodeDef(kind);
  const hasAttributes = nodeDef?.attributes && Object.keys(nodeDef.attributes).length > 0;

  const handleSaveAttributes = (newAttributes: Record<string, any>) => {
    setAttributes(newAttributes);
    updateEntityAttributes(kind, label, newAttributes);
  };

  const renderStyledBadge = () => {
    const style = nodeDef?.defaultStyle || {};
    const bgColor = style['background-color'] || '#7C5BF1';
    
    return (
      <Badge style={{ backgroundColor: bgColor }} className="text-white">
        {kind}
      </Badge>
    );
  };

  return (
    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span className="truncate">{label}</span>
          {renderStyledBadge()}
        </DialogTitle>
      </DialogHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
          {hasAttributes && (
            <TabsTrigger value="attributes" className="flex-1">Attributes</TabsTrigger>
          )}
          <TabsTrigger value="related" className="flex-1">Related</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="p-2">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Type</h3>
              <p className="text-sm">{kind}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Label</h3>
              <p className="text-sm">{label}</p>
            </div>
          </div>
        </TabsContent>
        
        {hasAttributes && (
          <TabsContent value="attributes" className="p-2">
            <EntityAttributesForm 
              kind={kind} 
              currentAttributes={attributes} 
              onSave={handleSaveAttributes} 
            />
          </TabsContent>
        )}
        
        <TabsContent value="related" className="p-2">
          <p className="text-sm text-muted-foreground">
            Related entities will appear here.
          </p>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}
