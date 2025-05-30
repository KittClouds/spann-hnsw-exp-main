
import { EntityWithReferences } from '@/livestore/queries/entities';

// Simple global state for entity selection
let selectedEntity: EntityWithReferences | null = null;
let entitySelectionListeners: Array<(entity: EntityWithReferences | null) => void> = [];

export const entityActions = {
  // Get current selected entity
  getSelectedEntity: () => selectedEntity,
  
  // Set selected entity and notify listeners
  setSelectedEntity: (entity: EntityWithReferences | null) => {
    selectedEntity = entity;
    entitySelectionListeners.forEach(listener => listener(entity));
  },
  
  // Subscribe to entity selection changes
  onEntitySelectionChange: (listener: (entity: EntityWithReferences | null) => void) => {
    entitySelectionListeners.push(listener);
    return () => {
      entitySelectionListeners = entitySelectionListeners.filter(l => l !== listener);
    };
  },
  
  // Clear selection
  clearSelection: () => {
    selectedEntity = null;
    entitySelectionListeners.forEach(listener => listener(null));
  }
};

// URL helpers for deep linking
export const entityUrlHelpers = {
  // Generate entity URL
  getEntityUrl: (entity: EntityWithReferences) => {
    const params = new URLSearchParams();
    params.set('entity', entity.label);
    params.set('kind', entity.kind);
    return `${window.location.pathname}?${params.toString()}`;
  },
  
  // Parse entity from URL
  getEntityFromUrl: (): { label: string; kind: string } | null => {
    const params = new URLSearchParams(window.location.search);
    const label = params.get('entity');
    const kind = params.get('kind');
    
    if (label && kind) {
      return { label, kind };
    }
    return null;
  },
  
  // Update URL with entity
  updateUrlWithEntity: (entity: EntityWithReferences) => {
    const url = entityUrlHelpers.getEntityUrl(entity);
    window.history.replaceState(null, '', url);
  },
  
  // Clear entity from URL
  clearEntityFromUrl: () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('entity');
    url.searchParams.delete('kind');
    window.history.replaceState(null, '', url.toString());
  }
};
