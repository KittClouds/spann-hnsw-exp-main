
import { useAtom } from 'jotai';
import { activeNoteAtom } from '@/lib/store';
import { useGraph } from '@/contexts/GraphContext';
import { Badge } from '@/components/ui/badge';
import { Link, ChevronDown, ChevronUp, Hash, AtSign } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function ConnectionsPanel() {
  const [activeNote] = useAtom(activeNoteAtom);
  const { getConnections, getBacklinks } = useGraph();
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<'links' | 'backlinks'>('links');
  
  const connections = activeNote ? getConnections(activeNote.id) : { tag: [], concept: [], mention: [] };
  const backlinks = activeNote ? getBacklinks(activeNote.id) : [];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#0a0a0d] border-t border-[#1a1b23] shadow-lg"
          >
            <div className="p-4 space-y-4 max-h-[300px] overflow-auto">
              <div className="flex justify-center space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => setActiveView('links')}
                  className={`px-6 ${activeView === 'links' ? 'bg-[#1a1b23] text-primary' : 'text-muted-foreground'}`}
                >
                  <Link className="mr-2 h-4 w-4" />
                  Links
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveView('backlinks')}
                  className={`px-6 ${activeView === 'backlinks' ? 'bg-[#1a1b23] text-primary' : 'text-muted-foreground'}`}
                >
                  <Link className="mr-2 h-4 w-4 transform rotate-180" />
                  Backlinks
                </Button>
              </div>

              {activeView === 'links' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-[#12141f] border-[#1a1b23]">
                    <CardContent className="p-4">
                      <h3 className="flex items-center text-sm font-medium mb-3 text-primary">
                        <Hash className="h-4 w-4 mr-2" /> 
                        Tags
                      </h3>
                      <div className="space-y-2">
                        {connections.tag.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {connections.tag.map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="secondary"
                                className="bg-[#1a1b23] hover:bg-[#22242f] text-primary border-none"
                              >
                                #{tag.title}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            No tags found
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#12141f] border-[#1a1b23]">
                    <CardContent className="p-4">
                      <h3 className="flex items-center text-sm font-medium mb-3 text-primary">
                        <AtSign className="h-4 w-4 mr-2" /> 
                        Mentions
                      </h3>
                      <div className="space-y-2">
                        {connections.mention.length > 0 ? (
                          <div className="space-y-1">
                            {connections.mention.map((mention) => (
                              <div
                                key={mention.id}
                                className="text-sm px-2 py-1 rounded-md bg-[#1a1b23] hover:bg-[#22242f] cursor-pointer transition-colors flex items-center"
                              >
                                @{mention.title}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            No mentions found
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#12141f] border-[#1a1b23]">
                    <CardContent className="p-4">
                      <h3 className="flex items-center text-sm font-medium mb-3 text-primary">
                        <Link className="h-4 w-4 mr-2" /> 
                        Links
                      </h3>
                      <div className="space-y-2">
                        {connections.concept.length > 0 ? (
                          <div className="space-y-1">
                            {connections.concept.map((link) => (
                              <div
                                key={link.id}
                                className="text-sm px-2 py-1 rounded-md bg-[#1a1b23] hover:bg-[#22242f] cursor-pointer transition-colors flex items-center"
                              >
                                [[{link.title}]]
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            No links found
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="bg-[#12141f] border-[#1a1b23]">
                  <CardContent className="p-4">
                    <h3 className="flex items-center text-sm font-medium mb-3 text-primary">
                      <Link className="h-4 w-4 mr-2 transform rotate-180" /> 
                      Backlinks
                    </h3>
                    <div className="space-y-2">
                      {backlinks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {backlinks.map((link) => (
                            <div
                              key={link.id}
                              className="text-sm px-2 py-1 rounded-md bg-[#1a1b23] hover:bg-[#22242f] cursor-pointer transition-colors flex items-center"
                            >
                              [[{link.title}]]
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          No backlinks to this note
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#0a0a0d] border-t border-[#1a1b23] rounded-none h-8 flex items-center justify-center hover:bg-[#12141f]"
      >
        <Link className="h-4 w-4 mr-2" />
        <span>Connections</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 ml-2" />
        ) : (
          <ChevronUp className="h-4 w-4 ml-2" />
        )}
      </Button>
    </div>
  );
}
