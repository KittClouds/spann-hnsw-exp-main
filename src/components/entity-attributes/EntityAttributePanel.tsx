import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { activeNoteConnectionsAtom, activeNoteAtom } from '@/lib/store';
import { useActiveClusterEntities } from '@/components/entity-manager/useActiveClusterEntities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, ChevronRight, FileText, FolderOpen } from 'lucide-react';

type ViewMode = 'note' | 'cluster';

export function EntityAttributePanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('note');
  const [selectedEntity, setSelectedEntity] = useState<{kind: string, label: string} | null>(null);
  
  // Use the same data sources as Entity Manager
  const [{ entities: noteEntities }] = useAtom(activeNoteConnectionsAtom);
  const [activeNote] = useAtom(activeNoteAtom);
  const clusterEntities = useActiveClusterEntities();
  
  // Choose entities based on view mode
  const entities = viewMode === 'note' ? noteEntities : clusterEntities;
  
  // Get attributes for selected entity (placeholder for now)
  const entityAttributes = selectedEntity 
    ? {} // Will implement attribute retrieval in next phase
    : {};

  // Helper function to safely render attribute values
  const renderAttributeValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (!selectedEntity) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center text-muted-foreground mb-4">
          <h3 className="text-sm font-medium mb-2">Entity Attributes</h3>
          <p className="text-xs">
            {activeNote ? `Viewing: ${activeNote.title}` : 'No active note'}
          </p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewMode === 'note' ? 'default' : 'ghost'}
            onClick={() => setViewMode('note')}
            size="sm"
            className="flex items-center gap-2"
          >
            <FileText className="h-3 w-3" />
            Note
          </Button>
          <Button
            variant={viewMode === 'cluster' ? 'default' : 'ghost'}
            onClick={() => setViewMode('cluster')}
            size="sm"
            className="flex items-center gap-2"
          >
            <FolderOpen className="h-3 w-3" />
            Cluster
          </Button>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {entities.map((entity, index) => (
              <Card 
                key={`${entity.kind}-${entity.label}-${index}`}
                className="bg-[#12141f] border-[#1a1b23] cursor-pointer hover:bg-[#191b28] transition-colors"
                onClick={() => setSelectedEntity({ kind: entity.kind, label: entity.label })}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-white">{entity.label}</div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {entity.kind.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {viewMode === 'cluster' && 'referenceCount' in entity && (
                        <span className="text-xs text-muted-foreground">
                          {entity.referenceCount} refs
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        
        {entities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">
              No entities found {viewMode === 'note' ? 'in this note' : 'in this cluster'}.
            </p>
            <p className="text-xs mt-1">
              Use <code className="bg-muted px-1 rounded">[TYPE|Label]</code> syntax to create entities.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{selectedEntity.label}</h3>
          <Badge variant="outline" className="text-xs capitalize mt-1">
            {selectedEntity.kind.toLowerCase()}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setSelectedEntity(null)}
          className="text-xs"
        >
          ← Back
        </Button>
      </div>
      
      <ScrollArea className="h-[400px]">
        {Object.keys(entityAttributes).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(entityAttributes).map(([key, value]) => (
              <Card key={key} className="bg-[#12141f] border-[#1a1b23]">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-white">{key}</span>
                    <span className="text-xs text-muted-foreground">
                      {renderAttributeValue(value)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No attributes found for this entity.</p>
            <p className="text-xs mt-1">Attributes can be added through the Entity Manager.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
