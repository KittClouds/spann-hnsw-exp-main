
import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Zap, Database, HardDrive } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { semanticSearchService } from '@/lib/embedding/SemanticSearchService';
import { useActiveNoteId, useNotes } from '@/hooks/useLiveStore';
import { useEmbeddings, useEmbeddingCount } from '@/hooks/useEmbeddings';
import { toast } from 'sonner';

interface SearchResult {
  noteId: string;
  title: string;
  content: string;
  score: number;
}

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [hnswStats, setHnswStats] = useState<any>({ ready: false });
  const [, setActiveNoteId] = useActiveNoteId();
  const notes = useNotes();
  
  // Use LiveStore reactive queries
  const embeddings = useEmbeddings();
  const embeddingCount = useEmbeddingCount();
  
  // Update counts and stats on mount and when embeddings change
  useEffect(() => {
    setSyncCount(semanticSearchService.getEmbeddingCount());
    setHnswStats(semanticSearchService.getHNSWStats());
  }, [embeddings]);

  const handleSearch = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await semanticSearchService.search(searchQuery, 10);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, 500);

  const handleSyncEmbeddings = useCallback(async () => {
    setIsLoading(true);
    try {
      const count = await semanticSearchService.syncAllNotes(notes);
      setSyncCount(count);
      setHnswStats(semanticSearchService.getHNSWStats());
      toast.success(`Synchronized ${count} note embeddings`);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync embeddings');
    } finally {
      setIsLoading(false);
    }
  }, [notes]);

  const handlePersistIndex = useCallback(async () => {
    try {
      await semanticSearchService.persistIndex();
      toast.success('HNSW index persisted');
    } catch (error) {
      console.error('Persist failed:', error);
      toast.error('Failed to persist index');
    }
  }, []);

  const handleSelectNote = (noteId: string) => {
    setActiveNoteId(noteId);
  };

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Semantic search..."
            className="pl-8"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleSearch(e.target.value);
            }}
          />
        </div>
        
        <div className="flex flex-col space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleSyncEmbeddings}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Sync Embeddings
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handlePersistIndex}
          >
            <HardDrive className="h-4 w-4 mr-2" />
            Persist Index
          </Button>
          
          {/* Display embedding status */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="h-3 w-3 mr-1" />
                <span>{embeddingCount} embeddings stored</span>
              </div>
              <div className="flex items-center">
                <span>{syncCount} in memory</span>
              </div>
            </div>
            
            {/* HNSW Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Badge variant={hnswStats.ready ? "default" : "secondary"} className="text-xs">
                  HNSW {hnswStats.ready ? "Ready" : "Loading"}
                </Badge>
              </div>
              {hnswStats.ready && (
                <div className="text-xs">
                  {hnswStats.currentCount || 0}/{hnswStats.maxElements || 0}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSearching && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {results.map((result) => (
            <div
              key={result.noteId}
              className="p-3 rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/10 cursor-pointer transition-colors"
              onClick={() => handleSelectNote(result.noteId)}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium text-sm truncate">{result.title}</div>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(result.score * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {result.content.slice(0, 100)}...
              </p>
            </div>
          ))}
          {query && !isSearching && results.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              <p className="text-sm">No results found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
