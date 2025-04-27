
import { useAtom } from 'jotai';
import { activeNoteAtom } from '@/lib/store';
import { useGraph } from '@/contexts/GraphContext';
import { Badge } from '@/components/ui/badge';
import { Link } from 'lucide-react';

export function ConnectionsPanel() {
  const [activeNote] = useAtom(activeNoteAtom);
  const { getConnections, getBacklinks } = useGraph();
  
  const connections = activeNote ? getConnections(activeNote.id) : { tag: [], concept: [], mention: [] };
  const backlinks = activeNote ? getBacklinks(activeNote.id) : [];
  
  return (
    <div className="flex flex-col gap-6 p-4 w-72 border-l border-border bg-[#0a0a0d]">
      <header className="flex items-center gap-2 text-lg font-semibold">
        <Link className="h-5 w-5" />
        <h2>Connections</h2>
      </header>

      <div className="flex justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-purple-400 bg-purple-400/10 px-4 py-2 rounded-md flex-grow">
          Links ({connections.concept.length})
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-4 py-2">
          Backlinks ({backlinks.length})
        </div>
      </div>

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
    </div>
  );
}
