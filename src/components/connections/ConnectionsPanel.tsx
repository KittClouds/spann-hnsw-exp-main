
import { useAtom } from 'jotai';
import { activeNoteAtom } from '@/lib/store';
import { useGraph } from '@/contexts/GraphContext';
import { Badge } from '@/components/ui/badge';
import { Link } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

export function ConnectionsPanel() {
  const [activeNote] = useAtom(activeNoteAtom);
  const { getConnections, getBacklinks } = useGraph();
  const [isOpen, setIsOpen] = useState(true);
  const [activeView, setActiveView] = useState<'links' | 'backlinks'>('links');
  
  const connections = activeNote ? getConnections(activeNote.id) : { tag: [], concept: [], mention: [] };
  const backlinks = activeNote ? getBacklinks(activeNote.id) : [];
  
  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className="fixed bottom-0 left-0 right-0 bg-[#0a0a0d] border-t border-border"
    >
      <header className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Connections</h2>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? '▼' : '▲'}
          </Button>
        </CollapsibleTrigger>
      </header>

      <CollapsibleContent>
        <div className="p-4 space-y-6">
          <div className="flex gap-2">
            <Button
              variant={activeView === 'links' ? 'secondary' : 'ghost'}
              onClick={() => setActiveView('links')}
              className="flex-1 text-sm"
            >
              Links ({connections.concept.length})
            </Button>
            <Button
              variant={activeView === 'backlinks' ? 'secondary' : 'ghost'}
              onClick={() => setActiveView('backlinks')}
              className="flex-1 text-sm"
            >
              Backlinks ({backlinks.length})
            </Button>
          </div>

          {activeView === 'links' ? (
            <>
              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  # TAGS
                </h3>
                <div className="space-y-2">
                  {connections.tag.length > 0 ? (
                    connections.tag.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="mr-2 bg-[#12141f] hover:bg-[#1a1b23] border-[#1a1b23]"
                      >
                        #{tag.title}
                      </Badge>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground bg-[#12141f] rounded-md p-4">
                      No tags. Use <span className="text-purple-400">@tag</span> in your note to add tags.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  @ MENTIONS
                </h3>
                <div className="space-y-2">
                  {connections.mention.length > 0 ? (
                    connections.mention.map((mention) => (
                      <div
                        key={mention.id}
                        className="text-sm p-2 rounded-md bg-[#12141f] hover:bg-[#1a1b23] cursor-pointer"
                      >
                        @{mention.title}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground bg-[#12141f] rounded-md p-4">
                      No mentions. Use <span className="text-purple-400">@name</span> in your note to add mentions.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  LINKS TO NOTES
                </h3>
                <div className="space-y-2">
                  {connections.concept.length > 0 ? (
                    connections.concept.map((link) => (
                      <div
                        key={link.id}
                        className="text-sm p-2 rounded-md bg-[#12141f] hover:bg-[#1a1b23] cursor-pointer"
                      >
                        [[{link.title}]]
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground bg-[#12141f] rounded-md p-4">
                      No outgoing links. Use <span className="text-purple-400">[[note title]]</span> to link to other notes.
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                BACKLINKS
              </h3>
              <div className="space-y-2">
                {backlinks.length > 0 ? (
                  backlinks.map((link) => (
                    <div
                      key={link.id}
                      className="text-sm p-2 rounded-md bg-[#12141f] hover:bg-[#1a1b23] cursor-pointer"
                    >
                      [[{link.title}]]
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground bg-[#12141f] rounded-md p-4">
                    No backlinks to this note.
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
