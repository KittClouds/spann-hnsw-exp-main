
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
    <div className="flex flex-col h-screen bg-gradient-to-b dark:from-galaxy-dark dark:to-[#222222] light:from-white light:to-[#f7f5ff] text-foreground animate-fade-in">
      <header className="border-b dark:border-opacity-30 light:border-opacity-10 p-4 flex items-center justify-between backdrop-blur-sm dark:bg-black/40 light:bg-white/70 relative z-10">
        <div className="flex-1">
          {/* Empty space for layout */}
        </div>
        <div className="text-center flex-1 flex flex-col items-center">
          <h1 className="text-2xl font-bold cosmic-text animate-pulse-subtle">Galaxy Notes</h1>
          <p className="text-sm text-muted-foreground">Multi-note block editor with automatic saving</p>
        </div>
        <div className="flex-1 flex justify-end">
          <ThemeToggle />
        </div>
      </header>
      
      <main className="flex flex-1 overflow-hidden relative">
        {/* Subtle cosmic background effect - visible in dark mode */}
        <div className="absolute inset-0 dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZGVmcz4KPHBhdHRlcm4gaWQ9InN0YXJzIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxjaXJjbGUgY3g9IjUiIGN5PSI1IiByPSIwLjUiIGZpbGw9IiM2RTU5QTUiIGZpbGwtb3BhY2l0eT0iMC4yIiAvPgo8Y2lyY2xlIGN4PSIyNSIgY3k9IjE1IiByPSIwLjMiIGZpbGw9IiM2RTU5QTUiIGZpbGwtb3BhY2l0eT0iMC4xNSIgLz4KPGNpcmNsZSBjeD0iNDUiIGN5PSI0NSIgcj0iMC40IiBmaWxsPSIjNkU1OUE1IiBmaWxsLW9wYWNpdHk9IjAuMiIgLz4KPGNpcmNsZSBjeD0iNzAiIGN5PSIzMCIgcj0iMC4yIiBmaWxsPSIjNkU1OUE1IiBmaWxsLW9wYWNpdHk9IjAuMTUiIC8+CjxjaXJjbGUgY3g9IjkwIiBjeT0iNzUiIHI9IjAuMyIgZmlsbD0iIzZFNTlBNSIgZmlsbC1vcGFjaXR5PSIwLjIiIC8+Cjwvc3ZnPg==')] opacity-30 pointer-events-none" />
        <NotesSidebar />
        <NoteEditor />
      </main>
    </div>
  );
}
