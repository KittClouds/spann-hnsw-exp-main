
import React, { useState } from 'react';
import { Search, Database, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanceDB } from '@/hooks/useLanceDB';
import { useActiveNoteId } from '@/hooks/useLiveStore';

export function VectorSearch() {
  const [query, setQuery] = useState('');
  const [, setActiveNoteId] = useActiveNoteId();
  const { 
    isInitialized, 
    isLoading, 
    searchResults, 
    stats, 
    searchSimilarNotes, 
    syncNotesToVectorDB 
  } = useLanceDB();

  const handleSearch = async () => {
    if (query.trim()) {
      await searchSimilarNotes(query);
    }
  };

  const handleNoteClick = (noteId: string) => {
    setActiveNoteId(noteId);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Vector Search
            {isInitialized ? (
              <Badge variant="secondary" className="ml-auto">
                {stats.count} vectors
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto">
                Initializing...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search for similar notes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
                disabled={!isInitialized || isLoading}
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={!isInitialized || isLoading || !query.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={syncNotesToVectorDB}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Notes
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Similar Notes:</h4>
              {searchResults.map((result, index) => (
                <Card 
                  key={result.id} 
                  className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleNoteClick(result.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {result.metadata?.title || 'Untitled'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {result.text.substring(0, 150)}...
                      </div>
                    </div>
                    <div className="ml-2 text-xs text-muted-foreground">
                      {result.score ? `${(1 - result.score).toFixed(3)}` : ''}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!isInitialized && (
            <div className="text-center py-4 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Initializing vector database...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
