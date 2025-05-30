
import { useEffect } from 'react';
import { useEntityCoOccurrences, useGlobalTriples } from './useLiveStore';
import { syncManager } from '@/services/SyncManager';

/**
 * Hook that syncs cross-note relationships from LiveStore to the Cytoscape graph
 * Subscribes to derived queries and triggers graph updates when data changes
 */
export function useCrossNoteGraphSync() {
  const coOccurrences = useEntityCoOccurrences();
  const globalTriples = useGlobalTriples();

  // Start the sync worker on mount
  useEffect(() => {
    syncManager.startCrossNoteSync();
    
    return () => {
      syncManager.stopCrossNoteSync();
    };
  }, []);

  // Trigger updates when cross-note data changes
  useEffect(() => {
    console.log('[useCrossNoteGraphSync] Co-occurrences changed, triggering graph update');
    syncManager.updateCrossNoteRelationships();
  }, [coOccurrences]);

  useEffect(() => {
    console.log('[useCrossNoteGraphSync] Global triples changed, triggering graph update');
    syncManager.updateCrossNoteRelationships();
  }, [globalTriples]);

  return {
    coOccurrences,
    globalTriples
  };
}
