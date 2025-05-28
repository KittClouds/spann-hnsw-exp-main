
import React, { useState } from 'react';
import { useActiveNoteConnections } from '@/hooks/useLiveStore';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Database, Link as LinkIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EntityDialogContent } from './EntityDialogContent';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export function EntityPanel() {
  const { entities, triples } = useActiveNoteConnections();
  const [isEntitiesOpen, setIsEntitiesOpen] = useState(true);
  const [isTriplesOpen, setIsTriplesOpen] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  const entityGroups = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    (Array.isArray(entities) ? entities : []).forEach(entity => {
      if (!groups[entity.kind]) {
        groups[entity.kind] = [];
      }
      groups[entity.kind].push(entity);
    });
    return groups;
  }, [entities]);

  return (
    <div className="space-y-4">
      <Collapsible open={isEntitiesOpen} onOpenChange={setIsEntitiesOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Entities ({Array.isArray(entities) ? entities.length : 0})</span>
            </div>
            {isEntitiesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          {Object.keys(entityGroups).length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No entities found in this note.</p>
          ) : (
            Object.entries(entityGroups).map(([kind, entityList]) => (
              <div key={kind} className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">{kind}</h4>
                {entityList.map((entity, index) => (
                  <Dialog key={index} onOpenChange={(open) => !open && setSelectedEntity(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => setSelectedEntity(entity)}
                      >
                        <span className="truncate">{entity.label}</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <EntityDialogContent entity={selectedEntity} />
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={isTriplesOpen} onOpenChange={setIsTriplesOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <span>Relationships ({Array.isArray(triples) ? triples.length : 0})</span>
            </div>
            {isTriplesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1">
          {!Array.isArray(triples) || triples.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No relationships found in this note.</p>
          ) : (
            triples.map((triple, index) => (
              <div key={index} className="p-2 text-sm bg-muted rounded">
                <span className="font-medium">{triple.subject.label}</span>
                <span className="text-muted-foreground mx-2">{triple.predicate}</span>
                <span className="font-medium">{triple.object.label}</span>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
