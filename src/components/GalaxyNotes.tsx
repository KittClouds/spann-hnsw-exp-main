
import { ThemeToggle } from "./ThemeToggle";
import { NotesSidebar } from "./NotesSidebar";
import { NoteEditor } from "./NoteEditor";

export function GalaxyNotes() {
  return (
    <div className="flex flex-col h-screen bg-gradient-dark dark:bg-gradient-dark light:bg-gradient-light text-foreground">
      <header className="border-b border-border p-4 flex items-center justify-between bg-opacity-95 backdrop-blur-sm">
        <div className="flex-1">
          {/* Empty space for layout */}
        </div>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Galaxy Notes</h1>
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
