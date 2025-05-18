
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NodeDef, schema } from '@/lib/schema';

interface EntityAttributesFormProps {
  kind: string;
  currentAttributes: Record<string, any>;
  onSave: (attributes: Record<string, any>) => void;
}

export function EntityAttributesForm({ kind, currentAttributes, onSave }: EntityAttributesFormProps) {
  const [attributes, setAttributes] = useState<Record<string, any>>(currentAttributes || {});
  const nodeDef = schema.getNodeDef(kind);
  
  if (!nodeDef || !nodeDef.attributes) {
    return (
      <div className="text-center py-2 text-sm text-muted-foreground">
        No custom attributes for this entity type
      </div>
    );
  }

  const handleChange = (key: string, value: any) => {
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(attributes);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {Object.entries(nodeDef.attributes).map(([key, attr]) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={`attr-${key}`}>{attr.label}</Label>
          
          {attr.type === 'string' && (
            <Input
              id={`attr-${key}`}
              value={attributes[key] || attr.default || ''}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          )}
          
          {attr.type === 'number' && (
            <Input
              id={`attr-${key}`}
              type="number"
              value={attributes[key] || attr.default || 0}
              onChange={(e) => handleChange(key, parseFloat(e.target.value))}
            />
          )}
          
          {attr.type === 'boolean' && (
            <div className="flex items-center space-x-2">
              <input
                id={`attr-${key}`}
                type="checkbox"
                checked={!!attributes[key]}
                onChange={(e) => handleChange(key, e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor={`attr-${key}`}>Enabled</Label>
            </div>
          )}
          
          {attr.type === 'enum' && attr.options && (
            <Select
              value={attributes[key] || attr.default || attr.options[0]}
              onValueChange={(value) => handleChange(key, value)}
            >
              <SelectTrigger id={`attr-${key}`}>
                <SelectValue placeholder={`Select ${attr.label}`} />
              </SelectTrigger>
              <SelectContent>
                {attr.options.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
      
      <Button type="submit" className="w-full">Save Attributes</Button>
    </form>
  );
}
