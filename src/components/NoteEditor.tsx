
import { useAtom } from 'jotai';
import { activeNoteAtom, activeNoteIdAtom } from '@/lib/store';
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useEffect, useRef } from 'react';

export function NoteEditor() {
  const [activeNote, setActiveNote] = useAtom(activeNoteAtom);
  const [activeNoteId] = useAtom(activeNoteIdAtom);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the textarea when the active note changes
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeNoteId]);
  
  if (!activeNote) {
    return <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
      No note selected
    </div>;
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActiveNote({
      ...activeNote,
      title: e.target.value
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setActiveNote({
      ...activeNote,
      content: e.target.value
    });
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      <Input
        value={activeNote.title}
        onChange={handleTitleChange}
        className="text-xl font-semibold mb-4 bg-transparent border-none focus-visible:ring-0 px-0 text-primary"
      />
      <Textarea
        ref={textareaRef}
        value={activeNote.content}
        onChange={handleContentChange}
        placeholder="Enter text or type '/' for commands"
        className="flex-1 resize-none bg-galaxy-editor rounded-md p-4 text-base leading-relaxed"
      />
    </div>
  );
}
