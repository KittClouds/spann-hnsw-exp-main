
import { useAtom } from 'jotai';
import { activeNoteAtom } from '@/lib/store';
import { useGraph } from '@/contexts/GraphContext';
import { Badge } from '@/components/ui/badge';
import { Link, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
      className="fixed bottom-0 left-0 right-0 bg-[#0a0a0d] border-t border-border shadow-lg"
    >
      <header className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Connections</h2>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </header>

      <CollapsibleContent>
        <div className="px-4 py-3 space-y-4">
          <div className="flex gap-2 mx-auto w-fit bg-[#12141f] rounded-md p-1">
            <Button
              variant={activeView === 'links' ? 'secondary' : 'ghost'}
              onClick={() => setActiveView('links')}
              className="w-32 text-sm font-medium h-8"
            >
              Links ({connections.concept.length})
            </Button>
            <Button
              variant={activeView === 'backlinks' ? 'secondary' : 'ghost'}
              onClick={() => setActiveView('backlinks')}
              className="w-32 text-sm font-medium h-8"
            >
              Backlinks ({backlinks.length})
            </Button>
          </div>

          {activeView === 'links' ? (
            <div className="grid grid-cols-1 gap-4">
              <section>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Tags
                </h3>
                <div>
                  {connections.tag.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {connections.tag.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="bg-[#12141f] hover:bg-[#1a1b23] border-[#1a1b23]"
                        >
                          #{tag.title}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-[#12141f] rounded-md p-3">
                      No tags. Use <span className="text-purple-400">#tag</span> in your note to add tags.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Mentions
                </h3>
                <div>
                  {connections.mention.length > 0 ? (
                    <div className="grid gap-1">
                      {connections.mention.map((mention) => (
                        <div
                          key={mention.id}
                          className="text-sm p-2 rounded-md bg-[#12141f] hover:bg-[#1a1b23] cursor-pointer transition-colors"
                        >
                          @{mention.title}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-[#12141f] rounded-md p-3">
                      No mentions. Use <span className="text-purple-400">@name</span> in your note to add mentions.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Links to Notes
                </h3>
                <div>
                  {connections.concept.length > 0 ? (
                    <div className="grid gap-1">
                      {connections.concept.map((link) => (
                        <div
                          key={link.id}
                          className="text-sm p-2 rounded-md bg-[#12141f] hover:bg-[#1a1b23] cursor-pointer transition-colors"
                        >
                          [[{link.title}]]
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-[#12141f] rounded-md p-3">
                      No outgoing links. Use <span className="text-purple-400">[[note title]]</span> to link to other notes.
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Backlinks
              </h3>
              <div>
                {backlinks.length > 0 ? (
                  <div className="grid gap-1">
                    {backlinks.map((link) => (
                      <div
                        key={link.id}
                        className="text-sm p-2 rounded-md bg-[#12141f] hover:bg-[#1a1b23] cursor-pointer transition-colors"
                      >
                        [[{link.title}]]
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-[#12141f] rounded-md p-3">
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
