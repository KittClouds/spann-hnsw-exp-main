import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Copy } from 'lucide-react';
import { EntityBlueprint, AttributeTemplate } from '@/types/blueprints';
import { AttributeType } from '@/types/attributes';
import { generateNodeId } from '@/lib/utils/ids';

interface BlueprintManagerProps {
  blueprints: EntityBlueprint[];
  entityTypes: string[];
  onBlueprintCreate: (blueprint: EntityBlueprint) => void;
  onBlueprintUpdate: (blueprint: EntityBlueprint) => void;
  onBlueprintDelete: (id: string) => void;
}

export function BlueprintManager({ 
  blueprints, 
  entityTypes, 
  onBlueprintCreate, 
  onBlueprintUpdate, 
  onBlueprintDelete 
}: BlueprintManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBlueprint, setNewBlueprint] = useState({
    entityKind: '',
    name: '',
    description: '',
    templates: [] as AttributeTemplate[]
  });

  const handleCreateBlueprint = () => {
    if (!newBlueprint.entityKind || !newBlueprint.name) return;

    const blueprint: EntityBlueprint = {
      id: generateNodeId(),
      entityKind: newBlueprint.entityKind,
      name: newBlueprint.name,
      description: newBlueprint.description,
      templates: newBlueprint.templates,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onBlueprintCreate(blueprint);
    setNewBlueprint({ entityKind: '', name: '', description: '', templates: [] });
    setIsCreating(false);
  };

  const handleAddTemplate = (blueprintId: string) => {
    const template: AttributeTemplate = {
      id: generateNodeId(),
      name: '',
      type: 'Text',
      required: false
    };

    if (blueprintId === 'new') {
      setNewBlueprint({
        ...newBlueprint,
        templates: [...newBlueprint.templates, template]
      });
    } else {
      const blueprint = blueprints.find(b => b.id === blueprintId);
      if (blueprint) {
        onBlueprintUpdate({
          ...blueprint,
          templates: [...blueprint.templates, template],
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  const handleUpdateTemplate = (blueprintId: string, templateId: string, updates: Partial<AttributeTemplate>) => {
    if (blueprintId === 'new') {
      setNewBlueprint({
        ...newBlueprint,
        templates: newBlueprint.templates.map(t => 
          t.id === templateId ? { ...t, ...updates } : t
        )
      });
    } else {
      const blueprint = blueprints.find(b => b.id === blueprintId);
      if (blueprint) {
        onBlueprintUpdate({
          ...blueprint,
          templates: blueprint.templates.map(t => 
            t.id === templateId ? { ...t, ...updates } : t
          ),
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  const handleRemoveTemplate = (blueprintId: string, templateId: string) => {
    if (blueprintId === 'new') {
      setNewBlueprint({
        ...newBlueprint,
        templates: newBlueprint.templates.filter(t => t.id !== templateId)
      });
    } else {
      const blueprint = blueprints.find(b => b.id === blueprintId);
      if (blueprint) {
        onBlueprintUpdate({
          ...blueprint,
          templates: blueprint.templates.filter(t => t.id !== templateId),
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  const renderTemplateEditor = (templates: AttributeTemplate[], blueprintId: string) => (
    <div className="space-y-2">
      {templates.map((template) => (
        <div key={template.id} className="flex gap-2 p-2 border rounded border-[#1a1b23] bg-[#12141f]">
          <Input
            value={template.name}
            onChange={(e) => handleUpdateTemplate(blueprintId, template.id, { name: e.target.value })}
            className="h-8 text-xs bg-[#0a0a0d] border-[#1a1b23]"
            placeholder="Attribute name"
          />
          <Select
            value={template.type}
            onValueChange={(type: AttributeType) => 
              handleUpdateTemplate(blueprintId, template.id, { type })
            }
          >
            <SelectTrigger className="w-32 h-8 text-xs bg-[#0a0a0d] border-[#1a1b23]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Text">Text</SelectItem>
              <SelectItem value="Number">Number</SelectItem>
              <SelectItem value="Boolean">Boolean</SelectItem>
              <SelectItem value="Date">Date</SelectItem>
              <SelectItem value="List">List</SelectItem>
              <SelectItem value="URL">URL</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRemoveTemplate(blueprintId, template.id)}
            className="h-8 w-8 p-0 hover:bg-red-900/20 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAddTemplate(blueprintId)}
        className="h-8 text-xs border-dashed"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Attribute
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Existing Blueprints */}
      <div className="grid gap-4">
        {blueprints.map((blueprint) => (
          <Card key={blueprint.id} className="bg-[#12141f] border-[#1a1b23]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{blueprint.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {blueprint.entityKind}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {blueprint.templates.length} attributes
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(editingId === blueprint.id ? null : blueprint.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onBlueprintDelete(blueprint.id)}
                    className="h-8 w-8 p-0 hover:bg-red-900/20 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {editingId === blueprint.id && (
              <CardContent className="pt-0">
                {renderTemplateEditor(blueprint.templates, blueprint.id)}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Create New Blueprint */}
      {isCreating ? (
        <Card className="bg-[#12141f] border-[#1a1b23] border-dashed">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  value={newBlueprint.name}
                  onChange={(e) => setNewBlueprint({ ...newBlueprint, name: e.target.value })}
                  className="h-8 text-xs bg-[#0a0a0d] border-[#1a1b23]"
                  placeholder="Blueprint name"
                />
              </div>
              <div>
                <Select
                  value={newBlueprint.entityKind}
                  onValueChange={(entityKind) => setNewBlueprint({ ...newBlueprint, entityKind })}
                >
                  <SelectTrigger className="h-8 text-xs bg-[#0a0a0d] border-[#1a1b23]">
                    <SelectValue placeholder="Entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              value={newBlueprint.description}
              onChange={(e) => setNewBlueprint({ ...newBlueprint, description: e.target.value })}
              className="text-xs bg-[#0a0a0d] border-[#1a1b23] resize-none"
              placeholder="Blueprint description (optional)"
              rows={2}
            />
            {renderTemplateEditor(newBlueprint.templates, 'new')}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateBlueprint}
                disabled={!newBlueprint.entityKind || !newBlueprint.name}
                className="h-8 text-xs"
              >
                Create Blueprint
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewBlueprint({ entityKind: '', name: '', description: '', templates: [] });
                }}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsCreating(true)}
          className="w-full h-10 border-dashed border-[#1a1b23] hover:bg-[#12141f]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Blueprint
        </Button>
      )}
    </div>
  );
}
