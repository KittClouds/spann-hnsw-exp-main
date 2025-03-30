
import { useAtom } from 'jotai';
import { activeNoteIdAtom, knowledgeGraphAtom, syncKnowledgeGraphAtom } from '@/lib/store';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from 'react';
import { Link, ExternalLink } from 'lucide-react';

export function ConnectionsPanel() {
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [knowledgeGraph] = useAtom(knowledgeGraphAtom);
  const [, syncGraph] = useAtom(syncKnowledgeGraphAtom);
  
  // Sync the graph when the component mounts
  useEffect(() => {
    syncGraph();
  }, [syncGraph]);
  
  // Get connections for the active note
  const outgoingLinks = activeNoteId 
    ? knowledgeGraph.getOutgoingLinks(activeNoteId) 
    : [];
    
  const incomingLinks = activeNoteId 
    ? knowledgeGraph.getIncomingLinks(activeNoteId) 
    : [];
  
  const handleLinkClick = (noteId: string) => {
    setActiveNoteId(noteId);
  };
  
  if (!activeNoteId) {
    return (
      <div className="p-4 text-muted-foreground text-sm">
        No note selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Link className="h-4 w-4" /> Connections
        </h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Outgoing links */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
              <ExternalLink className="h-3 w-3 mr-1" /> Outgoing Links ({outgoingLinks.length})
            </h4>
            
            {outgoingLinks.length > 0 ? (
              <div className="space-y-2">
                {outgoingLinks.map(link => (
                  <Card key={link.id} className="p-2 hover:bg-accent transition-colors">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start p-1 h-auto text-xs"
                      onClick={() => handleLinkClick(link.id)}
                    >
                      {link.title}
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No outgoing links. Create links by typing [[note title]] in your notes.
              </p>
            )}
          </div>
          
          {/* Incoming links */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
              <Link className="h-3 w-3 mr-1" /> Incoming Links ({incomingLinks.length})
            </h4>
            
            {incomingLinks.length > 0 ? (
              <div className="space-y-2">
                {incomingLinks.map(link => (
                  <Card key={link.id} className="p-2 hover:bg-accent transition-colors">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start p-1 h-auto text-xs"
                      onClick={() => handleLinkClick(link.id)}
                    >
                      {link.title}
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No incoming links from other notes.
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
