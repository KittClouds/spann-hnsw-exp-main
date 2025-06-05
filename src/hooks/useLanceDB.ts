
import { useState, useEffect, useCallback } from 'react';
import { lanceDBService, VectorSearchResult } from '@/services/LanceDBService';
import { useNotes } from '@/hooks/useLiveStore';
import { toast } from 'sonner';

export function useLanceDB() {
  const notes = useNotes();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [stats, setStats] = useState({ count: 0 });

  // Initialize LanceDB
  useEffect(() => {
    const initializeLanceDB = async () => {
      try {
        setIsLoading(true);
        await lanceDBService.initialize();
        setIsInitialized(true);
        
        // Sync existing notes to vector database
        if (notes.length > 0) {
          await syncNotesToVectorDB();
        }
        
        toast.success('Vector database initialized');
      } catch (error) {
        console.error('Failed to initialize LanceDB:', error);
        toast.error('Failed to initialize vector database');
      } finally {
        setIsLoading(false);
      }
    };

    if (!isInitialized) {
      initializeLanceDB();
    }
  }, [isInitialized]);

  // Sync notes to vector database
  const syncNotesToVectorDB = useCallback(async () => {
    if (!isInitialized || notes.length === 0) return;

    try {
      setIsLoading(true);
      
      const vectorNotes = notes.map(note => ({
        id: note.id,
        text: note.title + '\n' + (note.content ? 
          note.content.map((block: any) => 
            block.content?.map((item: any) => item.text || '').join(' ') || ''
          ).join('\n') : ''),
        type: note.type || 'note',
        metadata: {
          title: note.title,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          clusterId: note.clusterId,
          parentId: note.parentId
        }
      }));

      await lanceDBService.createNotesTable(vectorNotes);
      
      const newStats = await lanceDBService.getTableStats();
      setStats(newStats);
      
      console.log(`Synced ${vectorNotes.length} notes to vector database`);
    } catch (error) {
      console.error('Failed to sync notes to vector database:', error);
      toast.error('Failed to sync notes to vector database');
    } finally {
      setIsLoading(false);
    }
  }, [notes, isInitialized]);

  // Search similar notes
  const searchSimilarNotes = useCallback(async (
    query: string, 
    limit: number = 5
  ): Promise<VectorSearchResult[]> => {
    if (!isInitialized || !query.trim()) {
      return [];
    }

    try {
      setIsLoading(true);
      const results = await lanceDBService.searchSimilarNotes(query, limit);
      setSearchResults(results);
      return results;
    } catch (error) {
      console.error('Failed to search similar notes:', error);
      toast.error('Failed to search similar notes');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Add a note to vector database
  const addNoteToVectorDB = useCallback(async (note: any) => {
    if (!isInitialized) return;

    try {
      const vectorNote = {
        id: note.id,
        text: note.title + '\n' + (note.content ? 
          note.content.map((block: any) => 
            block.content?.map((item: any) => item.text || '').join(' ') || ''
          ).join('\n') : ''),
        type: note.type || 'note',
        metadata: {
          title: note.title,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          clusterId: note.clusterId,
          parentId: note.parentId
        }
      };

      await lanceDBService.addNote(vectorNote);
      
      const newStats = await lanceDBService.getTableStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to add note to vector database:', error);
    }
  }, [isInitialized]);

  return {
    isInitialized,
    isLoading,
    searchResults,
    stats,
    searchSimilarNotes,
    syncNotesToVectorDB,
    addNoteToVectorDB
  };
}
