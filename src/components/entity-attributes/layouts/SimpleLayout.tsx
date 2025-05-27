
import React from 'react';
import { TypedAttribute } from '@/types/attributes';
import { Badge } from '@/components/ui/badge';

interface SimpleLayoutProps {
  attributes: TypedAttribute[];
  onAttributeClick?: (attribute: TypedAttribute) => void;
}

export function SimpleLayout({ attributes, onAttributeClick }: SimpleLayoutProps) {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length > 0 ? `${value.length} items` : 'None';
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="space-y-3">
      {attributes.map(attr => (
        <div key={attr.id} className="bg-[#12141f] border border-[#1a1b23] rounded-lg p-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium text-white">{attr.name}</div>
              <Badge variant="outline" className="text-xs">
                {attr.type}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground max-w-[200px] text-right">
              {formatValue(attr.value)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
