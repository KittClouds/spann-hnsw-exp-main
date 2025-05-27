import React from 'react';
import { TypedAttribute } from '@/types/attributes';
import { Badge } from '@/components/ui/badge';

interface FactionOverviewLayoutProps {
  attributes: TypedAttribute[];
  onAttributeClick?: (attribute: TypedAttribute) => void;
}

export function FactionOverviewLayout({ attributes, onAttributeClick }: FactionOverviewLayoutProps) {
  const getAttributeByName = (name: string) => 
    attributes.find(attr => attr.name.toLowerCase().includes(name.toLowerCase()));

  const size = getAttributeByName('size');
  const powerLevel = getAttributeByName('power');
  const allies = getAttributeByName('allies');
  const enemies = getAttributeByName('enemies');

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex gap-4">
        {size && (
          <div className="text-center">
            <div className="text-lg font-bold text-white">{String(size.value)}</div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
        )}
        {powerLevel && (
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{String(powerLevel.value)}</div>
            <div className="text-xs text-muted-foreground">Power Level</div>
          </div>
        )}
      </div>

      {/* Allies */}
      {allies && Array.isArray(allies.value) && allies.value.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">Allies</h4>
          <div className="flex flex-wrap gap-1">
            {allies.value.map((ally: any, index: number) => (
              <Badge key={index} variant="outline" className="bg-green-900/20 border-green-700">
                {typeof ally === 'string' ? ally : ally.label || ally.entityLabel}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Enemies */}
      {enemies && Array.isArray(enemies.value) && enemies.value.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">Enemies</h4>
          <div className="flex flex-wrap gap-1">
            {enemies.value.map((enemy: any, index: number) => (
              <Badge key={index} variant="outline" className="bg-red-900/20 border-red-700">
                {typeof enemy === 'string' ? enemy : enemy.label || enemy.entityLabel}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Other attributes */}
      <div className="space-y-2">
        {attributes
          .filter(attr => !['size', 'power', 'allies', 'enemies'].some(name => 
            attr.name.toLowerCase().includes(name)
          ))
          .map(attr => (
            <div key={attr.id} className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground capitalize">{attr.name}</span>
              <span className="text-sm text-white">
                {typeof attr.value === 'object' ? JSON.stringify(attr.value) : String(attr.value)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
