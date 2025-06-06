
import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Zap } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { semanticSearchService } from '@/lib/embedding/SemanticSearchService';
import { useActiveNoteId, useNotes } from '@/hooks/useLiveStore';
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
  const [, setActiveNoteId] = useActiveNoteId();
  const notes = useNotes();

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
      await semanticSearchService.syncAllNotes(notes);
      const count = semanticSearchService.getEmbeddingCount();
      toast.success(`Synchronized ${count} note embeddings`);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync embeddings');
    } finally {
      setIsLoading(false);
    }
  }, [notes]);

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
