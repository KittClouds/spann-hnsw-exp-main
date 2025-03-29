
import { useAtom } from 'jotai';
import { activeNoteAtom, activeNoteIdAtom } from '@/lib/store';
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from 'react';
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

export function NoteEditor() {
  const [activeNote, setActiveNote] = useAtom(activeNoteAtom);
  const [activeNoteId] = useAtom(activeNoteIdAtom);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  // Create editor instance once we have a note
  const editor = useMemo(() => {
    if (!activeNote || !activeNote.content) return undefined;
    
    try {
      return BlockNoteEditor.create({
        initialContent: activeNote.content,
      });
    } catch (error) {
      console.error('Error creating BlockNoteEditor:', error);
      // Return editor with empty content as fallback
      return BlockNoteEditor.create();
    }
  }, [activeNoteId, activeNote]);

  // Update theme when app theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    // Initial check
    handleThemeChange();

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeNote) {
      setActiveNote({
        title: e.target.value
      });
    }
  };

  if (!activeNote || !editor) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
        {!activeNote ? "No note selected" : "Loading editor..."}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 dark:bg-[#0d0e18] light:bg-white">
      <Input
        value={activeNote.title}
        onChange={handleTitleChange}
        className="text-xl font-semibold mb-4 bg-transparent border-none focus-visible:ring-0 px-0 text-transparent bg-clip-text dark:bg-gradient-to-r dark:from-[#9b87f5] dark:to-[#7c5bf1] light:bg-gradient-to-r light:from-[#614ac2] light:to-[#7460db]"
        placeholder="Note Title"
      />
      <div className="flex-1 dark:bg-[#12141f] light:bg-[#f8f6ff] rounded-md shadow-xl border-border transition-all duration-200 overflow-auto">
        <BlockNoteView 
          editor={editor} 
          theme={theme}
          className="min-h-full"
          onChange={() => {
            // Save changes when editor content changes
            if (editor && activeNote) {
              setActiveNote({
                content: editor.document
              });
            }
          }}
        />
      </div>
    </div>
  );
}
