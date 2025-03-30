
import { ThemeToggle } from "./ThemeToggle";
import { NotesSidebar } from "./NotesSidebar";
import { NoteEditor } from "./NoteEditor";
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { syncKnowledgeGraphAtom } from '@/lib/store';

export function GalaxyNotes() {
  const [, syncGraph] = useAtom(syncKnowledgeGraphAtom);
  
  // Initialize knowledge graph when app loads
  useEffect(() => {
    syncGraph();
  }, [syncGraph]);

  return (
    <div className="flex flex-col h-screen dark:cosmic-gradient-dark light:cosmic-gradient-light text-foreground">
      <header className="border-b border-border/50 p-4 flex items-center justify-between bg-opacity-95 backdrop-blur-md dark:bg-black/20 light:bg-white/70">
        <div className="flex-1">
          {/* Empty space for layout */}
        </div>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold cosmos-text-gradient animate-pulse-gentle">Galaxy Notes</h1>
          <p className="text-sm text-muted-foreground">Multi-note block editor with automatic saving</p>
        </div>
        <div className="flex-1 flex justify-end">
          <ThemeToggle />
        </div>
      </header>
      
      <main className="flex flex-1 overflow-hidden">
        <NotesSidebar />
        <NoteEditor />
      </main>
    </div>
  );
}
