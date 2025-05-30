
import { useState, useMemo } from 'react';
import { 
  useActiveNoteEntities, 
  useClusterEntitiesMap, 
  useFolderEntitiesMap, 
  useAllEntitiesArray,
  useActiveClusterId,
  useActiveNote
} from './useLiveStore';
import { EntityWithReferences } from '@/livestore/queries/entities';

export type EntityScope = 'note' | 'folder' | 'cluster' | 'vault';

export interface ScopeInfo {
  type: EntityScope;
  id: string;
  name: string;
  description: string;
}

export function useEntitiesForScope() {
  const [scope, setScope] = useState<EntityScope>('note');
  
  // Get data from existing hooks
  const activeNote = useActiveNote();
  const [activeClusterId] = useActiveClusterId();
  const activeNoteEntities = useActiveNoteEntities();
  const clusterEntitiesMap = useClusterEntitiesMap();
  const folderEntitiesMap = useFolderEntitiesMap();
  const vaultEntities = useAllEntitiesArray();

  // Compute current scope info
  const scopeInfo = useMemo((): ScopeInfo => {
    switch (scope) {
      case 'note':
        return {
          type: 'note',
          id: activeNote?.id || '',
          name: activeNote?.title || 'No Note Selected',
          description: 'Entities in the current note'
        };
      case 'folder':
        // For now, use note's parent folder or default
        const folderId = activeNote?.parentId || 'root';
        return {
          type: 'folder',
          id: folderId,
          name: folderId === 'root' ? 'Root Folder' : 'Current Folder',
          description: 'Entities in the current folder and subfolders'
        };
      case 'cluster':
        return {
          type: 'cluster',
          id: activeClusterId,
          name: activeClusterId === 'cluster-default' ? 'Default Cluster' : activeClusterId,
          description: 'Entities in the current cluster'
        };
      case 'vault':
        return {
          type: 'vault',
          id: 'vault',
          name: 'Entire Vault',
          description: 'All entities across the vault'
        };
      default:
        return {
          type: 'note',
          id: '',
          name: 'Unknown Scope',
          description: ''
        };
    }
  }, [scope, activeNote, activeClusterId]);

  // Get entities based on current scope
  const entities = useMemo((): EntityWithReferences[] => {
    switch (scope) {
      case 'note':
        return activeNoteEntities;
      case 'folder':
        const folderId = activeNote?.parentId || 'root';
        return folderEntitiesMap.get(folderId) || [];
      case 'cluster':
        return clusterEntitiesMap.get(activeClusterId) || [];
      case 'vault':
        return vaultEntities;
      default:
        return [];
    }
  }, [scope, activeNoteEntities, folderEntitiesMap, clusterEntitiesMap, vaultEntities, activeNote?.parentId, activeClusterId]);

  // Group entities by kind
  const entityGroups = useMemo(() => {
    const groups: Record<string, EntityWithReferences[]> = {};
    
    entities.forEach(entity => {
      if (!groups[entity.kind]) {
        groups[entity.kind] = [];
      }
      groups[entity.kind].push(entity);
    });
    
    return groups;
  }, [entities]);

  // Statistics
  const stats = useMemo(() => ({
    totalEntities: entities.length,
    entityTypes: Object.keys(entityGroups).length,
    totalReferences: entities.reduce((sum, entity) => sum + entity.referenceCount, 0)
  }), [entities, entityGroups]);

  return {
    scope,
    setScope,
    scopeInfo,
    entities,
    entityGroups,
    stats
  };
}
