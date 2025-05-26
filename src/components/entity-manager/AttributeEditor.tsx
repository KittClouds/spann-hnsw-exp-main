import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Check, XCircle, Zap } from 'lucide-react';
import { TypedAttribute, AttributeType, AttributeValue } from '@/types/attributes';
import { EntityBlueprint } from '@/types/blueprints';
import { TypedAttributeInput } from './TypedAttributeInput';
import { BlueprintSelector } from './BlueprintSelector';
import { generateNodeId } from '@/lib/utils/ids';

interface AttributeEditorProps {
  attributes: TypedAttribute[];
  onAttributesChange: (attributes: TypedAttribute[]) => void;
  entityKind: string;
  entityLabel: string;
  availableBlueprints?: EntityBlueprint[];
}

export function AttributeEditor({ 
  attributes, 
  onAttributesChange, 
  entityKind, 
  entityLabel,
  availableBlueprints = []
}: AttributeEditorProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBlueprintSelector, setShowBlueprintSelector] = useState(
    attributes.length === 0 && availableBlueprints.length > 0
  );
  const [newAttribute, setNewAttribute] = useState({
    name: '',
    type: 'Text' as AttributeType,
    value: '' as AttributeValue,
    unit: ''
  });

  const handleApplyBlueprint = (blueprint: EntityBlueprint) => {
    const blueprintAttributes: TypedAttribute[] = blueprint.templates.map(template => ({
      id: generateNodeId(),
      name: template.name,
      type: template.type,
      value: template.defaultValue || getDefaultValueForType(template.type),
      unit: template.unit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    onAttributesChange([...attributes, ...blueprintAttributes]);
    setShowBlueprintSelector(false);
  };

  const getDefaultValueForType = (type: AttributeType): AttributeValue => {
    switch (type) {
      case 'Text': return '';
      case 'Number': return 0;
      case 'Boolean': return false;
      case 'Date': return new Date().toISOString();
      case 'List': return [];
      case 'URL': return '';
      default: return '';
    }
  };

  const handleAddAttribute = () => {
    if (!newAttribute.name.trim()) return;

    const attribute: TypedAttribute = {
      id: generateNodeId(),
      name: newAttribute.name.trim(),
      type: newAttribute.type,
      value: newAttribute.value,
      unit: newAttribute.unit || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAttributesChange([...attributes, attribute]);
    setNewAttribute({ name: '', type: 'Text', value: '', unit: '' });
    setIsAddingNew(false);
  };

  const handleUpdateAttribute = (id: string, updates: Partial<TypedAttribute>) => {
    const updatedAttributes = attributes.map(attr => 
      attr.id === id 
        ? { ...attr, ...updates, updatedAt: new Date().toISOString() }
        : attr
    );
    onAttributesChange(updatedAttributes);
    setEditingId(null);
  };

  const handleDeleteAttribute = (id: string) => {
    onAttributesChange(attributes.filter(attr => attr.id !== id));
  };

  const getTypeColor = (type: AttributeType): string => {
    const colors = {
      Text: 'bg-blue-500/20 text-blue-400',
      Number: 'bg-green-500/20 text-green-400',
      Boolean: 'bg-purple-500/20 text-purple-400',
      Date: 'bg-orange-500/20 text-orange-400',
      List: 'bg-yellow-500/20 text-yellow-400',
      EntityLink: 'bg-pink-500/20 text-pink-400',
      URL: 'bg-cyan-500/20 text-cyan-400'
    };
    return colors[type];
  };

  const formatAttributeValue = (attribute: TypedAttribute): string => {
    switch (attribute.type) {
      case 'Boolean':
        return attribute.value ? 'true' : 'false';
      case 'Date':
        return new Date(attribute.value as string).toLocaleDateString();
      case 'List':
        return (attribute.value as string[]).join(', ');
      case 'EntityLink':
        const ref = attribute.value as any;
        return ref?.label || 'Invalid Reference';
      default:
        return String(attribute.value);
    }
  };

  return (
    <div className="space-y-3">
      {/* Blueprint Selector */}
      {showBlueprintSelector && (
        <BlueprintSelector
          entityKind={entityKind}
          availableBlueprints={availableBlueprints.filter(b => b.entityKind === entityKind)}
          onApplyBlueprint={handleApplyBlueprint}
          onSkip={() => setShowBlueprintSelector(false)}
        />
      )}

      {/* Blueprint Trigger */}
      {!showBlueprintSelector && availableBlueprints.some(b => b.entityKind === entityKind) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBlueprintSelector(true)}
          className="h-7 text-xs border-dashed border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
        >
          <Zap className="h-3 w-3 mr-1" />
          Apply Blueprint
        </Button>
      )}

      {/* Existing Attributes */}
      {attributes.map((attribute) => (
        <Card key={attribute.id} className="bg-[#12141f] border-[#1a1b23]">
          <CardContent className="p-3">
            {editingId === attribute.id ? (
              <div className="space-y-2">
                <Input
                  value={attribute.name}
                  onChange={(e) => handleUpdateAttribute(attribute.id, { name: e.target.value })}
                  className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
                  placeholder="Attribute name"
                />
                <div className="flex gap-2">
                  <Select
                    value={attribute.type}
                    onValueChange={(type: AttributeType) => 
                      handleUpdateAttribute(attribute.id, { type, value: '' })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Text">Text</SelectItem>
                      <SelectItem value="Number">Number</SelectItem>
                      <SelectItem value="Boolean">Boolean</SelectItem>
                      <SelectItem value="Date">Date</SelectItem>
                      <SelectItem value="List">List</SelectItem>
                      <SelectItem value="EntityLink">Entity Link</SelectItem>
                      <SelectItem value="URL">URL</SelectItem>
                    </SelectContent>
                  </Select>
                  {attribute.type === 'Number' && (
                    <Input
                      value={attribute.unit || ''}
                      onChange={(e) => handleUpdateAttribute(attribute.id, { unit: e.target.value })}
                      className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23] w-20"
                      placeholder="Unit"
                    />
                  )}
                </div>
                <TypedAttributeInput
                  type={attribute.type}
                  value={attribute.value}
                  onChange={(value) => handleUpdateAttribute(attribute.id, { value })}
                  entityKind={entityKind}
                  entityLabel={entityLabel}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setEditingId(null)}
                    className="h-6 px-2 text-xs"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    className="h-6 px-2 text-xs hover:bg-red-900/20 hover:text-red-400"
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-xs ${getTypeColor(attribute.type)}`}>
                      {attribute.type}
                    </Badge>
                    <span className="text-xs font-medium text-white">
                      {attribute.name}
                      {attribute.unit && ` (${attribute.unit})`}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatAttributeValue(attribute)}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(attribute.id)}
                    className="h-6 w-6 p-0 hover:bg-blue-900/20 hover:text-blue-400"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAttribute(attribute.id)}
                    className="h-6 w-6 p-0 hover:bg-red-900/20 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add New Attribute */}
      {isAddingNew ? (
        <Card className="bg-[#12141f] border-[#1a1b23] border-dashed">
          <CardContent className="p-3 space-y-2">
            <Input
              value={newAttribute.name}
              onChange={(e) => setNewAttribute({ ...newAttribute, name: e.target.value })}
              className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
              placeholder="Attribute name"
            />
            <div className="flex gap-2">
              <Select
                value={newAttribute.type}
                onValueChange={(type: AttributeType) => 
                  setNewAttribute({ ...newAttribute, type, value: '' })
                }
              >
                <SelectTrigger className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Text">Text</SelectItem>
                  <SelectItem value="Number">Number</SelectItem>
                  <SelectItem value="Boolean">Boolean</SelectItem>
                  <SelectItem value="Date">Date</SelectItem>
                  <SelectItem value="List">List</SelectItem>
                  <SelectItem value="EntityLink">Entity Link</SelectItem>
                  <SelectItem value="URL">URL</SelectItem>
                </SelectContent>
              </Select>
              {newAttribute.type === 'Number' && (
                <Input
                  value={newAttribute.unit}
                  onChange={(e) => setNewAttribute({ ...newAttribute, unit: e.target.value })}
                  className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23] w-20"
                  placeholder="Unit"
                />
              )}
            </div>
            <TypedAttributeInput
              type={newAttribute.type}
              value={newAttribute.value}
              onChange={(value) => setNewAttribute({ ...newAttribute, value })}
              entityKind={entityKind}
              entityLabel={entityLabel}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddAttribute}
                disabled={!newAttribute.name.trim()}
                className="h-6 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewAttribute({ name: '', type: 'Text', value: '', unit: '' });
                }}
                className="h-6 px-2 text-xs hover:bg-red-900/20 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="ghost"
          onClick={() => setIsAddingNew(true)}
          className="w-full h-8 border-dashed border border-[#1a1b23] hover:bg-[#12141f] text-muted-foreground hover:text-white"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Attribute
        </Button>
      )}
    </div>
  );
}
