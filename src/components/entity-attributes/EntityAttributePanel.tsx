
import React, { useState } from 'react';
import { useGraph } from '@/contexts/GraphContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, ChevronRight } from 'lucide-react';

export function EntityAttributePanel() {
  const graph = useGraph();
  const [selectedEntity, setSelectedEntity] = useState<{kind: string, label: string} | null>(null);
  
  // Get all entities from the graph
  const entities = graph.getAllEntities();
  
  // Get attributes for selected entity
  const entityAttributes = selectedEntity 
    ? graph.getEntityAttributes(selectedEntity.kind, selectedEntity.label) || {}
    : {};

  if (!selectedEntity) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center text-muted-foreground mb-4">
          <h3 className="text-sm font-medium mb-2">Entity Attributes</h3>
          <p className="text-xs">Select an entity to view its attributes</p>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {entities.map((entity, index) => (
              <Card 
                key={`${entity.kind}-${entity.label}-${index}`}
                className="bg-[#12141f] border-[#1a1b23] cursor-pointer hover:bg-[#191b28] transition-colors"
                onClick={() => setSelectedEntity({ kind: entity.kind, label: entity.label })}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-white">{entity.label}</div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {entity.kind.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {entity.referenceCount} refs
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        
        {entities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No entities found in your notes.</p>
            <p className="text-xs mt-1">
              Use <code className="bg-muted px-1 rounded">[TYPE|Label]</code> syntax to create entities.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{selectedEntity.label}</h3>
          <Badge variant="outline" className="text-xs capitalize mt-1">
            {selectedEntity.kind.toLowerCase()}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setSelectedEntity(null)}
          className="text-xs"
        >
          ← Back
        </Button>
      </div>
      
      <ScrollArea className="h-[400px]">
        {Object.keys(entityAttributes).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(entityAttributes).map(([key, value]) => (
              <Card key={key} className="bg-[#12141f] border-[#1a1b23]">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-white">{key}</span>
                    <span className="text-xs text-muted-foreground">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No attributes found for this entity.</p>
            <p className="text-xs mt-1">Attributes can be added through the Entity Manager.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
