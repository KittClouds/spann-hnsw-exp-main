
import { ThemeToggle } from "./ThemeToggle";
import { NoteEditor } from "./NoteEditor";

export function GalaxyNotes() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-b dark:from-[#0f101a] dark:to-[#171926] light:from-white light:to-[#f8f6ff] text-foreground">
      <header className="border-b border-border p-4 flex items-center justify-between bg-opacity-95 backdrop-blur-sm dark:bg-black/30 light:bg-white/70">
        <div className="flex-1">
          {/* Empty space for layout */}
        </div>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text dark:bg-gradient-to-r dark:from-[#9b87f5] dark:to-[#7c5bf1] light:bg-gradient-to-r light:from-[#614ac2] light:to-[#7460db]">Galaxy Notes</h1>
          <p className="text-sm text-muted-foreground">Multi-note block editor with automatic saving</p>
        </div>
        <div className="flex-1 flex justify-end">
          <ThemeToggle />
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <NoteEditor />
      </main>
    </div>
  );
}
