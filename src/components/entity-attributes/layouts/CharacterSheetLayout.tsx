import React from 'react';
import { TypedAttribute } from '@/types/attributes';
import { ProgressBarRenderer } from '../renderers/ProgressBarRenderer';
import { StatBlockRenderer } from '../renderers/StatBlockRenderer';
import { RelationshipRenderer } from '../renderers/RelationshipRenderer';

interface CharacterSheetLayoutProps {
  attributes: TypedAttribute[];
  onAttributeClick?: (attribute: TypedAttribute) => void;
}

export function CharacterSheetLayout({ attributes, onAttributeClick }: CharacterSheetLayoutProps) {
  const getAttributeByName = (name: string) => 
    attributes.find(attr => attr.name.toLowerCase() === name.toLowerCase());

  const portrait = getAttributeByName('portrait');
  const stats = getAttributeByName('stats');
  const health = getAttributeByName('health');
  const mana = getAttributeByName('mana');
  const relationships = getAttributeByName('relationships');

  return (
    <div className="space-y-4">
      {/* Header with portrait and basic info */}
      <div className="flex gap-4">
        {portrait && (
          <div className="w-20 h-20 bg-[#1a1b23] rounded-lg flex items-center justify-center">
            {typeof portrait.value === 'string' && portrait.value ? (
              <img 
                src={portrait.value} 
                alt="Portrait" 
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <span className="text-xs text-muted-foreground">No Image</span>
            )}
          </div>
        )}
        
        <div className="flex-1 space-y-2">
          {/* Progress bars */}
          {health && health.type === 'ProgressBar' && (
            <ProgressBarRenderer 
              value={health.value as any} 
              label="Health" 
            />
          )}
          {mana && mana.type === 'ProgressBar' && (
            <ProgressBarRenderer 
              value={mana.value as any} 
              label="Mana" 
            />
          )}
        </div>
      </div>

      {/* Stats block */}
      {stats && stats.type === 'StatBlock' && (
        <div className="bg-[#12141f] border border-[#1a1b23] rounded-lg p-3">
          <h4 className="text-sm font-medium text-white mb-3">Ability Scores</h4>
          <StatBlockRenderer value={stats.value as any} />
        </div>
      )}

      {/* Other attributes */}
      <div className="space-y-2">
        {attributes
          .filter(attr => !['portrait', 'stats', 'health', 'mana', 'relationships'].includes(attr.name.toLowerCase()))
          .map(attr => (
            <div key={attr.id} className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground capitalize">{attr.name}</span>
              <span className="text-sm text-white">
                {typeof attr.value === 'object' ? JSON.stringify(attr.value) : String(attr.value)}
              </span>
            </div>
          ))}
      </div>

      {/* Relationships */}
      {relationships && Array.isArray(relationships.value) && relationships.value.length > 0 && (
        <div className="bg-[#12141f] border border-[#1a1b23] rounded-lg p-3">
          <h4 className="text-sm font-medium text-white mb-3">Relationships</h4>
          <div className="space-y-1">
            {relationships.value.map((rel: any, index: number) => (
              <RelationshipRenderer 
                key={index} 
                value={rel} 
                onClick={() => onAttributeClick?.(relationships)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
