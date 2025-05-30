
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, FileText, FolderOpen, Database, Globe } from 'lucide-react';
import { EntityScope, ScopeInfo } from '@/hooks/useEntitiesForScope';

interface ScopeSelectorProps {
  scope: EntityScope;
  scopeInfo: ScopeInfo;
  onScopeChange: (scope: EntityScope) => void;
  stats: {
    totalEntities: number;
    entityTypes: number;
    totalReferences: number;
  };
}

const scopeConfig = {
  note: { icon: FileText, label: 'Note', color: 'bg-blue-500' },
  folder: { icon: FolderOpen, label: 'Folder', color: 'bg-green-500' },
  cluster: { icon: Database, label: 'Cluster', color: 'bg-purple-500' },
  vault: { icon: Globe, label: 'Vault', color: 'bg-orange-500' }
};

export function ScopeSelector({ scope, scopeInfo, onScopeChange, stats }: ScopeSelectorProps) {
  const currentConfig = scopeConfig[scope];
  const Icon = currentConfig.icon;

  return (
    <div className="flex items-center justify-between p-3 border-b border-[#1a1b23]">
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-3 py-2">
              <div className={`w-2 h-2 rounded-full ${currentConfig.color}`} />
              <Icon className="h-4 w-4" />
              <span className="font-medium">{currentConfig.label}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {Object.entries(scopeConfig).map(([scopeKey, config]) => {
              const ScopeIcon = config.icon;
              return (
                <DropdownMenuItem
                  key={scopeKey}
                  onClick={() => onScopeChange(scopeKey as EntityScope)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-2 h-2 rounded-full ${config.color}`} />
                  <ScopeIcon className="h-4 w-4" />
                  <span>{config.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex flex-col">
          <span className="text-sm font-medium text-primary truncate max-w-[200px]">
            {scopeInfo.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {scopeInfo.description}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {stats.totalEntities} entities
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {stats.entityTypes} types
        </Badge>
      </div>
    </div>
  );
}
