
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Network, Link2 } from 'lucide-react';
import { useActiveNoteEntityRelations } from '@/hooks/useActiveNoteEntityRelations';

export function RelatedPanel() {
  const { coOccurrences, globalTriples, hasData } = useActiveNoteEntityRelations();
  
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No cross-note relationships found for entities in this note.</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      {/* Often Seen With */}
      <Card className="bg-[#12141f] border-[#1a1b23]">
        <CardHeader className="py-2">
          <CardTitle className="text-sm font-medium flex items-center text-primary">
            <Network className="h-4 w-4 mr-2" />
            Often Seen With
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ScrollArea className="h-[200px]">
            {coOccurrences.length > 0 ? (
              <div className="space-y-2">
                {coOccurrences.map((coOcc, idx) => (
                  <div
                    key={`${coOcc.entity.kind}-${coOcc.entity.label}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-md bg-[#1a1b23] hover:bg-[#22242f] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{coOcc.entity.label}</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {coOcc.entity.kind.toLowerCase()}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      {coOcc.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No co-occurrences found
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Global Facts */}
      <Card className="bg-[#12141f] border-[#1a1b23]">
        <CardHeader className="py-2">
          <CardTitle className="text-sm font-medium flex items-center text-primary">
            <Link2 className="h-4 w-4 mr-2" />
            Global Facts
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ScrollArea className="h-[200px]">
            {globalTriples.length > 0 ? (
              <div className="space-y-2">
                {globalTriples.map((triple, idx) => (
                  <div
                    key={`${triple.subject.kind}-${triple.subject.label}-${triple.predicate}-${triple.object.kind}-${triple.object.label}-${idx}`}
                    className="p-2 rounded-md bg-[#1a1b23] hover:bg-[#22242f] cursor-pointer transition-colors"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {triple.predicate}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{triple.subject.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {triple.subject.kind}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">→</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{triple.object.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {triple.object.kind}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Found in {triple.noteIds.size} note{triple.noteIds.size !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No global facts found
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
