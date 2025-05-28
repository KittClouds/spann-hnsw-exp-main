
import React, { useState, useMemo } from 'react';
import { useActiveNoteConnections, useActiveNote, useEntityAttributes, useBlueprintsArray } from '@/hooks/useLiveStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Save, Trash2, Database, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { SimpleLayout } from './layouts/SimpleLayout';
import { CharacterSheetLayout } from './layouts/CharacterSheetLayout';
import { FactionOverviewLayout } from './layouts/FactionOverviewLayout';

export function EntityAttributePanel() {
  const { entities } = useActiveNoteConnections();
  const activeNote = useActiveNote();
  const entityAttributes = useEntityAttributes();
  const blueprints = useBlueprintsArray();
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('simple');

  // Group entities by kind
  const entityGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (Array.isArray(entities) ? entities : []).forEach(entity => {
      if (!groups[entity.kind]) {
        groups[entity.kind] = [];
      }
      groups[entity.kind].push(entity);
    });
    return groups;
  }, [entities]);

  // Get attributes for selected entity
  const selectedEntityAttributes = useMemo(() => {
    if (!selectedEntity) return null;
    return entityAttributes.find(
      attr => attr.entityKind === selectedEntity.kind && attr.entityLabel === selectedEntity.label
    );
  }, [selectedEntity, entityAttributes]);

  const renderEntityContent = () => {
    if (!selectedEntity) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Entity Selected</h3>
          <p className="text-muted-foreground">
            Select an entity from the list to view and edit its attributes
          </p>
        </div>
      );
    }

    const layouts = {
      simple: SimpleLayout,
      character: CharacterSheetLayout,
      faction: FactionOverviewLayout,
    };

    const LayoutComponent = layouts[activeTab as keyof typeof layouts] || SimpleLayout;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{selectedEntity.label}</h3>
            <Badge variant="secondary">{selectedEntity.kind}</Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simple">Simple</TabsTrigger>
            <TabsTrigger value="character">Character</TabsTrigger>
            <TabsTrigger value="faction">Faction</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4">
            <LayoutComponent
              entity={selectedEntity}
              attributes={selectedEntityAttributes?.attributes || {}}
              onAttributeChange={() => {}}
              onSave={() => {}}
            />
          </TabsContent>

          <TabsContent value="character" className="space-y-4">
            <LayoutComponent
              entity={selectedEntity}
              attributes={selectedEntityAttributes?.attributes || {}}
              onAttributeChange={() => {}}
              onSave={() => {}}
            />
          </TabsContent>

          <TabsContent value="faction" className="space-y-4">
            <LayoutComponent
              entity={selectedEntity}
              attributes={selectedEntityAttributes?.attributes || {}}
              onAttributeChange={() => {}}
              onSave={() => {}}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Entity Attributes</h2>
          <Badge variant="outline">
            {Array.isArray(entities) ? entities.length : 0} entities
          </Badge>
        </div>

        {/* Entity List */}
        <div className="space-y-2">
          <Label>Select Entity</Label>
          <Select
            value={selectedEntity?.label || ''}
            onValueChange={(value) => {
              const entity = (Array.isArray(entities) ? entities : []).find(e => e.label === value);
              setSelectedEntity(entity || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose an entity..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(entityGroups).map(([kind, entityList]) => (
                <React.Fragment key={kind}>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted">
                    {kind}
                  </div>
                  {entityList.map((entity) => (
                    <SelectItem key={entity.label} value={entity.label}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Note Info */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Current Note:</span>
            <span className="text-muted-foreground truncate">
              {activeNote?.title || 'Untitled Note'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {renderEntityContent()}
      </div>
    </div>
  );
}
