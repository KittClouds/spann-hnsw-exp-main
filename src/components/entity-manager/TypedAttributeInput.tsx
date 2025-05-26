
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { AttributeType, AttributeValue, EntityReference } from '@/types/attributes';

interface TypedAttributeInputProps {
  type: AttributeType;
  value: AttributeValue;
  onChange: (value: AttributeValue) => void;
  entityKind: string;
  entityLabel: string;
}

export function TypedAttributeInput({ 
  type, 
  value, 
  onChange, 
  entityKind, 
  entityLabel 
}: TypedAttributeInputProps) {
  const [listInput, setListInput] = useState('');

  const handleListAdd = () => {
    if (!listInput.trim()) return;
    const currentList = Array.isArray(value) ? value : [];
    onChange([...currentList, listInput.trim()]);
    setListInput('');
  };

  const handleListRemove = (index: number) => {
    const currentList = Array.isArray(value) ? value : [];
    onChange(currentList.filter((_, i) => i !== index));
  };

  const formatDateForInput = (dateValue: AttributeValue): string => {
    if (!dateValue) return '';
    const date = new Date(dateValue as string);
    return date.toISOString().split('T')[0];
  };

  switch (type) {
    case 'Text':
      return (
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
          placeholder="Enter text value"
        />
      );

    case 'Number':
      return (
        <Input
          type="number"
          value={String(value || '')}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
          placeholder="Enter number"
        />
      );

    case 'Boolean':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(Boolean(checked))}
            className="data-[state=checked]:bg-primary"
          />
          <span className="text-xs text-muted-foreground">
            {Boolean(value) ? 'True' : 'False'}
          </span>
        </div>
      );

    case 'Date':
      return (
        <Input
          type="date"
          value={formatDateForInput(value)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
        />
      );

    case 'List':
      const currentList = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={listInput}
              onChange={(e) => setListInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleListAdd()}
              className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23] flex-1"
              placeholder="Add list item"
            />
            <Button
              size="sm"
              onClick={handleListAdd}
              disabled={!listInput.trim()}
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {currentList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentList.map((item, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs flex items-center gap-1 bg-[#1a1b23] hover:bg-[#22242f]"
                >
                  {String(item)}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleListRemove(index)}
                    className="h-3 w-3 p-0 hover:bg-red-900/20 hover:text-red-400"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      );

    case 'EntityLink':
      // For now, we'll use a simple text input. This could be enhanced with a searchable dropdown
      const entityRef = value as EntityReference;
      return (
        <div className="space-y-2">
          <Input
            value={entityRef?.label || ''}
            onChange={(e) => onChange({
              entityId: `entity-${e.target.value.toLowerCase().replace(/\s+/g, '-')}`,
              kind: 'UNKNOWN',
              label: e.target.value
            } as EntityReference)}
            className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
            placeholder="Entity name or reference"
          />
          <div className="text-xs text-muted-foreground">
            Note: Enhanced entity linking will be available in future updates
          </div>
        </div>
      );

    case 'URL':
      return (
        <Input
          type="url"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
          placeholder="https://example.com"
        />
      );

    default:
      return (
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
          placeholder="Enter value"
        />
      );
  }
}
