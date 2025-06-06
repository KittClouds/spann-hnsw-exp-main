
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { embeddingService } from '@/services/EmbeddingService';
import { useActiveNoteId } from '@/hooks/useLiveStore';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface SearchResult {
  noteId: string;
  title: string;
  score: number;
  content: string;
}

export function EmbeddingSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setActiveNoteId] = useActiveNoteId();

  const handleSearch = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setIsLoading(true);
    try {
      if (!embeddingService.isInitialized()) {
        await embeddingService.initialize();
      }
      
      const searchResults = await embeddingService.search(searchQuery, 10);
      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 500);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    handleSearch(value);
  };

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Semantic search..."
          className="pl-8"
          value={query}
          onChange={handleInputChange}
        />
      </div>
      
      {isLoading && (
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
              onClick={() => setActiveNoteId(result.noteId)}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium text-sm truncate">{result.title}</div>
                <Badge variant="secondary" className="text-xs">
                  {(result.score * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {result.content.substring(0, 100)}...
              </p>
            </div>
          ))}
          {!isLoading && query && results.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No results found for "{query}"
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
