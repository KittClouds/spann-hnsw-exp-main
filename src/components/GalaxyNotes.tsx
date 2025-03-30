
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
    <div className="flex flex-col h-screen bg-background dark:bg-galaxy-black text-foreground stars-bg">
      <div className="z-10 relative">
        <header className="border-b border-galaxy-editor-border/50 p-4 flex items-center justify-between backdrop-blur-lg bg-white/90 dark:bg-galaxy-black/80">
          <div className="flex-1">
            {/* Empty space for layout */}
          </div>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold cosmic-text animate-float">Galaxy Notes</h1>
            <p className="text-sm text-muted-foreground mt-1">Multi-note block editor with automatic saving</p>
          </div>
          <div className="flex-1 flex justify-end">
            <ThemeToggle />
          </div>
        </header>
      </div>
      
      <main className="flex flex-1 overflow-hidden relative z-10">
        <NotesSidebar />
        <NoteEditor />
      </main>
    </div>
  );
}
