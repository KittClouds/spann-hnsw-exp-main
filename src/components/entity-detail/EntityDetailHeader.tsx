
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, Link, Pin, PinOff } from 'lucide-react';
import { SelectedEntity } from '@/lib/entityDetailStore';
import { useEntityActions } from '@/hooks/useEntityActions';

interface EntityDetailHeaderProps {
  entity: SelectedEntity;
  referenceCount?: number;
}

export function EntityDetailHeader({ entity, referenceCount }: EntityDetailHeaderProps) {
  const { openEntityInNewTab, copyEntityLink, pinEntity, isEntityPinned } = useEntityActions();
  const isPinned = isEntityPinned(entity);

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex flex-col min-w-0 flex-1">
          <h2 className="font-semibold truncate text-lg">{entity.label}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize text-xs">
              {entity.kind.toLowerCase()}
            </Badge>
            {referenceCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                {referenceCount} references
              </span>
            )}
          </div>
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEntityInNewTab(entity)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => copyEntityLink(entity)}>
            <Link className="h-4 w-4 mr-2" />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => pinEntity(entity)}>
            {isPinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Unpin entity
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Pin entity
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
