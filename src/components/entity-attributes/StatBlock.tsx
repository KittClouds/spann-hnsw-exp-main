
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Check, X } from 'lucide-react';
import { StatBlockAttribute } from '@/types/enhancedAttributes';

interface StatBlockProps {
  name: string;
  statBlock: StatBlockAttribute;
  onChange: (statBlock: StatBlockAttribute) => void;
  readOnly?: boolean;
}

export function StatBlock({ name, statBlock, onChange, readOnly = false }: StatBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingStats, setEditingStats] = useState(statBlock.stats);

  const handleSave = () => {
    onChange({ ...statBlock, stats: editingStats });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingStats(statBlock.stats);
    setIsEditing(false);
  };

  const handleStatChange = (statName: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditingStats(prev => ({ ...prev, [statName]: numValue }));
  };

  return (
    <Card className="bg-[#12141f] border-[#1a1b23]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {statBlock.category}
            </Badge>
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isEditing ? (
          <div className="space-y-2">
            {Object.entries(editingStats).map(([statName, value]) => (
              <div key={statName} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 capitalize">
                  {statName}
                </span>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleStatChange(statName, e.target.value)}
                  className="w-16 h-6 px-2 text-xs bg-[#0a0a0d] border border-[#1a1b23] rounded"
                  min={0}
                  max={20}
                />
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleSave} className="h-6 px-2 text-xs">
                <Check className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleCancel}
                className="h-6 px-2 text-xs hover:bg-red-900/20 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(statBlock.stats).map(([statName, value]) => (
              <div key={statName} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground capitalize">
                  {statName}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {value}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
