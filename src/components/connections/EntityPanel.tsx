
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Database, Link as LinkIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EntityDialogContent } from './EntityDialogContent';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useEntitiesForScope } from '@/hooks/useEntitiesForScope';
import { Badge } from '@/components/ui/badge';

interface EntityPanelProps {
  entitiesScope: ReturnType<typeof useEntitiesForScope>;
}

export function EntityPanel({ entitiesScope }: EntityPanelProps) {
  const { entities, entityGroups } = entitiesScope;
  const [isEntitiesOpen, setIsEntitiesOpen] = useState(true);
  const [isTriplesOpen, setIsTriplesOpen] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  // For triples, we'll use the active note connections for now
  // TODO: In future, we could aggregate triples across scopes
  const triples: any[] = []; // Simplified for now

  return (
    <div className="space-y-4">
      <Collapsible open={isEntitiesOpen} onOpenChange={setIsEntitiesOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Entities ({entities.length})</span>
            </div>
            {isEntitiesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          {Object.keys(entityGroups).length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">
              No entities found in this {entitiesScope.scopeInfo.type}.
            </p>
          ) : (
            Object.entries(entityGroups).map(([kind, entityList]) => (
              <div key={kind} className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{kind}</h4>
                  <Badge variant="outline" className="text-xs">
                    {entityList.length}
                  </Badge>
                </div>
                {entityList.map((entity, index) => (
                  <Dialog key={entity.id || index} onOpenChange={(open) => !open && setSelectedEntity(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between text-left"
                        onClick={() => setSelectedEntity(entity)}
                      >
                        <span className="truncate">{entity.label}</span>
                        {entity.referenceCount > 1 && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            {entity.referenceCount}
                          </Badge>
                        )}
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
              <span>Relationships ({triples.length})</span>
            </div>
            {isTriplesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1">
          {triples.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">
              No relationships found in this {entitiesScope.scopeInfo.type}.
            </p>
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
