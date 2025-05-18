
import React, { useState, useEffect } from 'react';
import { EntityWithReferences } from './EntityBrowser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGraph } from '@/contexts/GraphContext';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntityAttributesForm } from '@/components/connections/EntityAttributesForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EntityDetailPanelProps {
  entity: EntityWithReferences;
  onClose: () => void;
  onEntityUpdated: () => void;
}

export function EntityDetailPanel({ entity, onClose, onEntityUpdated }: EntityDetailPanelProps) {
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [references, setReferences] = useState<{id: string, title: string}[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const graph = useGraph();
  
  useEffect(() => {
    if (graph) {
      // Load entity attributes
      const attrs = graph.getEntityAttributes(entity.kind, entity.label) || {};
      setAttributes(attrs);
      
      // TODO: This would need to be implemented in GraphService
      // Load references and relationships from graph
      if (graph.getEntityReferences) {
        setReferences(graph.getEntityReferences(entity.kind, entity.label));
      }
      
      if (graph.getEntityRelationships) {
        setRelationships(graph.getEntityRelationships(entity.kind, entity.label));
      }
    }
  }, [entity, graph]);
  
  const handleSaveAttributes = (newAttributes: Record<string, any>) => {
    if (graph) {
      graph.updateEntityAttributes(entity.kind, entity.label, newAttributes);
      setAttributes(newAttributes);
      onEntityUpdated();
    }
  };
  
  return (
    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span className="truncate">{entity.label}</span>
          <Badge className="ml-2 capitalize">{entity.kind.toLowerCase()}</Badge>
        </DialogTitle>
      </DialogHeader>
      
      <Tabs defaultValue="attributes" className="w-full h-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="references">References</TabsTrigger>
        </TabsList>
        
        <TabsContent value="attributes" className="h-[400px] overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <EntityAttributesForm 
              kind={entity.kind} 
              currentAttributes={attributes}
              onSave={handleSaveAttributes}
            />
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="relationships" className="h-[400px] overflow-hidden">
          <ScrollArea className="h-full pr-4">
            {relationships.length > 0 ? (
              <div className="space-y-4">
                {relationships.map((rel, idx) => (
                  <Card key={idx}>
                    <CardHeader className="py-2">
                      <CardTitle className="text-sm font-medium">{rel.predicate}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex items-center gap-2">
                        <span>{rel.target.label}</span>
                        <Badge variant="outline" className="capitalize">
                          {rel.target.kind.toLowerCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No relationships found for this entity.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="references" className="h-[400px] overflow-hidden">
          <ScrollArea className="h-full pr-4">
            {references.length > 0 ? (
              <div className="space-y-2">
                {references.map(ref => (
                  <Card key={ref.id}>
                    <CardContent className="py-4">
                      <a href={`/#/note/${ref.id}`} className="text-primary hover:underline">
                        {ref.title}
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No references found for this entity.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </DialogContent>
  );
}
