
import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { activeNoteConnectionsAtom, activeNoteAtom } from '@/lib/store';
import { useActiveClusterEntities } from '@/components/entity-manager/useActiveClusterEntities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, ChevronRight, FileText, FolderOpen, RefreshCw } from 'lucide-react';
import { useGraph } from '@/contexts/GraphContext';
import { getBlueprintForEntityKind } from '@/lib/blueprintMatching';
import { TypedAttribute } from '@/types/attributes';
import { CharacterSheetLayout } from './layouts/CharacterSheetLayout';
import { FactionOverviewLayout } from './layouts/FactionOverviewLayout';
import { SimpleLayout } from './layouts/SimpleLayout';

type ViewMode = 'note' | 'cluster';

export function EntityAttributePanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('note');
  const [selectedEntity, setSelectedEntity] = useState<{kind: string, label: string} | null>(null);
  const [entityAttributes, setEntityAttributes] = useState<TypedAttribute[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Use the same data sources as Entity Manager
  const [{ entities: noteEntities }] = useAtom(activeNoteConnectionsAtom);
  const [activeNote] = useAtom(activeNoteAtom);
  const clusterEntities = useActiveClusterEntities();
  const graph = useGraph();
  
  // Choose entities based on view mode
  const entities = viewMode === 'note' ? noteEntities : clusterEntities;

  // Auto-refresh attributes every 500ms when an entity is selected
  useEffect(() => {
    if (!selectedEntity) return;
    
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 500);
    
    return () => clearInterval(interval);
  }, [selectedEntity]);

  // Load entity attributes when an entity is selected or refresh is triggered
  useEffect(() => {
    if (selectedEntity && graph) {
      const attributes = graph.getEntityAttributes?.(selectedEntity.kind, selectedEntity.label);
      if (attributes) {
        // Handle enhanced format vs legacy format
        if (attributes.attributes && Array.isArray(attributes.attributes)) {
          setEntityAttributes(attributes.attributes);
        } else {
          // Convert legacy format to TypedAttribute format
          const typedAttributes: TypedAttribute[] = Object.entries(attributes).map(([name, value]) => ({
            id: `${selectedEntity.kind}-${selectedEntity.label}-${name}`,
            name,
            type: inferAttributeType(value),
            value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          setEntityAttributes(typedAttributes);
        }
      } else {
        // Create default attributes from blueprint
        const blueprint = getBlueprintForEntityKind(selectedEntity.kind);
        if (blueprint) {
          const defaultAttributes: TypedAttribute[] = blueprint.templates.map(template => ({
            id: `${selectedEntity.kind}-${selectedEntity.label}-${template.name}`,
            name: template.name,
            type: template.type,
            value: template.defaultValue || getDefaultValueForType(template.type),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          setEntityAttributes(defaultAttributes);
        } else {
          setEntityAttributes([]);
        }
      }
    }
  }, [selectedEntity, graph, refreshTrigger]);

  // Helper function to infer attribute type from value
  const inferAttributeType = (value: any): any => {
    if (typeof value === 'string') return 'Text';
    if (typeof value === 'number') return 'Number';
    if (typeof value === 'boolean') return 'Boolean';
    if (Array.isArray(value)) return 'List';
    if (value && typeof value === 'object') {
      if ('current' in value && 'maximum' in value) return 'ProgressBar';
      if ('strength' in value) return 'StatBlock';
      if ('entityId' in value && 'relationshipType' in value) return 'Relationship';
    }
    return 'Text';
  };

  // Helper function to get default value for attribute type
  const getDefaultValueForType = (type: string): any => {
    switch (type) {
      case 'ProgressBar': return { current: 100, maximum: 100 };
      case 'StatBlock': return { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
      case 'Relationship': return { entityId: '', entityLabel: '', relationshipType: '' };
      case 'Number': return 0;
      case 'Boolean': return false;
      case 'List': return [];
      case 'Date': return new Date().toISOString();
      default: return '';
    }
  };

  // Render appropriate layout based on entity kind
  const renderEntityLayout = () => {
    if (!selectedEntity || entityAttributes.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No attributes found for this entity.</p>
          <p className="text-xs mt-1">Attributes can be added through the Entity Manager.</p>
        </div>
      );
    }

    const handleAttributeClick = (attribute: TypedAttribute) => {
      console.log('Attribute clicked:', attribute);
    };

    switch (selectedEntity.kind) {
      case 'CHARACTER':
        return (
          <CharacterSheetLayout 
            attributes={entityAttributes}
            onAttributeClick={handleAttributeClick}
          />
        );
      case 'FACTION':
        return (
          <FactionOverviewLayout 
            attributes={entityAttributes}
            onAttributeClick={handleAttributeClick}
          />
        );
      default:
        return (
          <SimpleLayout 
            attributes={entityAttributes}
            onAttributeClick={handleAttributeClick}
          />
        );
    }
  };

  if (!selectedEntity) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center text-muted-foreground mb-4">
          <h3 className="text-sm font-medium mb-2">Entity Attributes</h3>
          <p className="text-xs">
            {activeNote ? `Viewing: ${activeNote.title}` : 'No active note'}
          </p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewMode === 'note' ? 'default' : 'ghost'}
            onClick={() => setViewMode('note')}
            size="sm"
            className="flex items-center gap-2"
          >
            <FileText className="h-3 w-3" />
            Note
          </Button>
          <Button
            variant={viewMode === 'cluster' ? 'default' : 'ghost'}
            onClick={() => setViewMode('cluster')}
            size="sm"
            className="flex items-center gap-2"
          >
            <FolderOpen className="h-3 w-3" />
            Cluster
          </Button>
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
                      {viewMode === 'cluster' && 'referenceCount' in entity && (
                        <span className="text-xs text-muted-foreground">
                          {(entity.referenceCount as number)} refs
                        </span>
                      )}
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
            <p className="text-sm">
              No entities found {viewMode === 'note' ? 'in this note' : 'in this cluster'}.
            </p>
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
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedEntity(null)}
            className="text-xs"
          >
            ← Back
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-[400px]">
        {renderEntityLayout()}
      </ScrollArea>
    </div>
  );
}
