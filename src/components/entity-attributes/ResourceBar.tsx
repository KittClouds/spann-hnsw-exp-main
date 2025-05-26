
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ResourceAttribute } from '@/types/enhancedAttributes';

interface ResourceBarProps {
  name: string;
  resource: ResourceAttribute;
  onChange: (resource: ResourceAttribute) => void;
  readOnly?: boolean;
}

export function ResourceBar({ name, resource, onChange, readOnly = false }: ResourceBarProps) {
  const percentage = Math.round((resource.current / resource.max) * 100);
  
  const getBarColor = () => {
    if (resource.color) return resource.color;
    if (percentage > 75) return 'bg-green-500';
    if (percentage > 50) return 'bg-yellow-500';
    if (percentage > 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCurrent = Math.max(0, Math.min(resource.max, parseInt(e.target.value) || 0));
    onChange({ ...resource, current: newCurrent });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(1, parseInt(e.target.value) || 1);
    onChange({ ...resource, max: newMax, current: Math.min(resource.current, newMax) });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{name}</span>
        <Badge variant="outline" className="text-xs">
          {resource.current}/{resource.max} {resource.unit || ''}
        </Badge>
      </div>
      
      <Progress 
        value={percentage} 
        className="h-3"
        style={{ 
          background: 'rgba(255,255,255,0.1)',
        }}
      />
      
      {!readOnly && (
        <div className="flex gap-2">
          <input
            type="number"
            value={resource.current}
            onChange={handleCurrentChange}
            min={0}
            max={resource.max}
            className="w-16 h-6 px-2 text-xs bg-[#0a0a0d] border border-[#1a1b23] rounded"
            placeholder="Current"
          />
          <span className="text-xs text-muted-foreground self-center">/</span>
          <input
            type="number"
            value={resource.max}
            onChange={handleMaxChange}
            min={1}
            className="w-16 h-6 px-2 text-xs bg-[#0a0a0d] border border-[#1a1b23] rounded"
            placeholder="Max"
          />
        </div>
      )}
    </div>
  );
}
