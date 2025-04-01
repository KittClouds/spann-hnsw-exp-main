
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
    <div className="flex flex-col h-screen dark:cosmic-bg-dark light:cosmic-bg-light text-foreground">
      <header className="dark:cosmic-header-dark light:cosmic-header-light p-4 flex items-center justify-between z-10">
        <div className="flex-1">
          {/* Empty space for layout */}
        </div>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold dark:cosmic-text-gradient-dark light:cosmic-text-gradient-light">
            Galaxy Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-note block editor with automatic saving
          </p>
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
