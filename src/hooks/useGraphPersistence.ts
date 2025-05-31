
import { useEffect } from 'react';
import { useStore } from '@livestore/react';
import { graphPersistenceService } from '@/services/GraphPersistenceService';
import { useGraph } from '@/contexts/GraphContext';

/**
 * Hook to initialize and manage graph persistence
 */
export function useGraphPersistence() {
  const { store } = useStore();
  const { graph } = useGraph(); // Using 'graph' which should be the correct property name
  
  useEffect(() => {
    if (store && graph) {
      // Initialize the persistence service
      graphPersistenceService.initialize(store, graph);
      
      console.log('[useGraphPersistence] Graph persistence initialized');
      
      // Cleanup on unmount
      return () => {
        graphPersistenceService.destroy();
        console.log('[useGraphPersistence] Graph persistence destroyed');
      };
    }
  }, [store, graph]);
  
  return {
    saveGraph: () => graphPersistenceService.saveGraphToStore(),
    loadGraph: () => graphPersistenceService.loadGraphFromStore(),
    saveLayout: (name: string, isDefault?: boolean, clusterId?: string) => 
      graphPersistenceService.saveLayout(name, isDefault, clusterId),
    loadLayout: (layoutId: string) => 
      graphPersistenceService.loadLayout(layoutId)
  };
}
