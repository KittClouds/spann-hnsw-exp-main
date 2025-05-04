
import React from 'react';
import { useAtom } from 'jotai';
import { activeNoteConnectionsAtom } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, FileSymlink, CircleDashed } from 'lucide-react';
import { useGraph } from '@/contexts/GraphContext';

export function EntityPanel() {
  const [{ entities, triples }] = useAtom(activeNoteConnectionsAtom);
  const graph = useGraph();

  // Group entities by their kind/type
  const entityGroups = React.useMemo(() => {
    const groups: Record<string, typeof entities> = {};
    
    entities.forEach(entity => {
      if (!groups[entity.kind]) {
        groups[entity.kind] = [];
      }
      groups[entity.kind].push(entity);
    });
    
    return groups;
  }, [entities]);

  const handleTripleClick = (triple: any) => {
    if (triple.id) {
      // If supported by app navigation, focus on this triple in the graph
      const graphInstance = graph.getGraph?.();
      if (graphInstance) {
        try {
          graphInstance.getElementById(triple.id).select();
          graphInstance.center(triple.id);
        } catch (e) {
          console.error("Could not focus triple in graph", e);
        }
      }
    }
  };

  if (entities.length === 0 && triples.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <p>No entities or relationships found in this note.</p>
        <p className="mt-2">
          Use <code className="bg-muted px-1 rounded">[TYPE|Label]</code> syntax to create entities.
        </p>
        <p className="mt-1">
          Define relationships with <code className="bg-muted px-1 rounded">[TYPE|Entity1] (RELATIONSHIP) [TYPE|Entity2]</code> syntax.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Entities section */}
      {Object.entries(entityGroups).length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Entities</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {Object.entries(entityGroups).map(([kind, entityList]) => (
              <Card key={kind} className="bg-[#12141f] border-[#1a1b23]">
                <CardContent className="p-3">
                  <h4 className="flex items-center text-xs font-medium mb-2 text-primary">
                    <Link className="h-3 w-3 mr-1" /> 
                    {kind}
                  </h4>
                  <div className="space-y-1">
                    {entityList.map((entity) => (
                      <Badge
                        key={`${entity.kind}-${entity.label}`}
                        variant="secondary"
                        className="bg-[#1a1b23] hover:bg-[#22242f] text-primary border-none mr-1 mb-1 text-xs"
                      >
                        {entity.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Relationships section */}
      {triples.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Relationships</h3>
          <div className="space-y-2">
            {triples.map((triple, index) => (
              <div 
                key={index}
                className="bg-[#12141f] border border-[#1a1b23] p-3 rounded-md hover:bg-[#191b28] cursor-pointer transition-colors"
                onClick={() => handleTripleClick(triple)}
              >
                <div className="flex items-center justify-between text-xs flex-wrap">
                  <div className="flex items-center mb-1 md:mb-0">
                    <Badge variant="outline" className="border-[#7E69AB]/30 mr-1">
                      {triple.subject.kind}
                    </Badge>
                    <span className="font-medium text-white">
                      {triple.subject.label}
                    </span>
                  </div>
                  
                  <Badge className="mx-2 bg-[#7C5BF1] text-white border-none flex items-center">
                    <CircleDashed className="h-3 w-3 mr-1" />
                    {triple.predicate}
                  </Badge>
                  
                  <div className="flex items-center">
                    <Badge variant="outline" className="border-[#7E69AB]/30 mr-1">
                      {triple.object.kind}
                    </Badge>
                    <span className="font-medium text-white">
                      {triple.object.label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
