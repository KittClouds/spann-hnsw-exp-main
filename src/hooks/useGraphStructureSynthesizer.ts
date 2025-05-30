
import { useEffect } from 'react';
import { useStore } from '@livestore/react';
import { syncManager } from '@/services/SyncManager';

/**
 * Hook to initialize and manage the GraphStructureSynthesizer
 * This ensures the synthesizer is properly connected to the LiveStore
 * and updates the graph with derived cross-note relationships
 */
export function useGraphStructureSynthesizer() {
  const { store } = useStore();
  
  useEffect(() => {
    if (!store) {
      console.warn('[useGraphStructureSynthesizer] Store not available yet');
      return;
    }
    
    // Initialize the synthesizer with the store
    syncManager.initializeGraphStructureSynthesizer(store);
    
    // Cleanup on unmount
    return () => {
      syncManager.destroyGraphStructureSynthesizer();
    };
  }, [store]);
  
  // No return value needed - this is a setup-only hook
}
