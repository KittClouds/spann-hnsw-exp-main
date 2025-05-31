
import { useEffect } from 'react';
import { Store } from '@livestore/livestore';
import { Core } from 'cytoscape';
import { graphPersistenceService } from '@/services/GraphPersistenceService';

/**
 * Hook to initialize and manage graph persistence
 */
export function useGraphPersistence(store?: Store, cytoscape?: Core | null) {
  useEffect(() => {
    if (store && cytoscape) {
      // Initialize the persistence service
      graphPersistenceService.initialize(store, cytoscape);
      
      console.log('[useGraphPersistence] Graph persistence initialized');
      
      // Cleanup on unmount
      return () => {
        graphPersistenceService.destroy();
        console.log('[useGraphPersistence] Graph persistence destroyed');
      };
    }
  }, [store, cytoscape]);
  
  return {
    saveGraph: () => graphPersistenceService.saveGraphToStore(),
    loadGraph: () => graphPersistenceService.loadGraphFromStore(),
    saveLayout: (name: string, isDefault?: boolean, clusterId?: string) => 
      graphPersistenceService.saveLayout(name, isDefault, clusterId),
    loadLayout: (layoutId: string) => 
      graphPersistenceService.loadLayout(layoutId)
  };
}
