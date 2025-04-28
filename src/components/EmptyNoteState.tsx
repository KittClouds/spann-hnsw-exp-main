
import { File } from "lucide-react";
import { Button } from "./ui/button";
import { useAtom } from "jotai";
import { activeClusterIdAtom, createNote, notesAtom } from "@/lib/store";
import { toast } from "sonner";
import { ClusterId } from "@/lib/utils/ids";

export function EmptyNoteState() {
  const [notes, setNotes] = useAtom(notesAtom);
  const [activeClusterId] = useAtom(activeClusterIdAtom);

  const handleCreateNote = () => {
    // Make sure activeClusterId is properly cast to ClusterId type if not null
    const clusterId = activeClusterId ? activeClusterId as ClusterId : null;
    const { id, note } = createNote(null, clusterId);
    setNotes(prevNotes => [...prevNotes, note]);
    toast("New note created", {
      description: "Start typing to edit your note"
    });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#0a0a0d] text-center px-4">
      <div className="w-16 h-16 mb-8 rounded-full bg-gradient-to-r from-[#1A1F2C] to-[#2A1F3D] flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-[#7c5bf1]" />
      </div>
      
      <h1 className="text-4xl font-semibold mb-4 bg-gradient-to-r from-[#9b87f5] to-[#7c5bf1] bg-clip-text text-transparent">
        No note selected
      </h1>
      
      <p className="text-lg text-gray-400 mb-8 max-w-md">
        Select a note from the sidebar or create a new one to begin your creative journey.
      </p>

      <Button
        onClick={handleCreateNote}
        className="bg-gradient-to-r from-[#1A1F2C] to-[#2A1F3D] hover:from-[#2A1F3D] hover:to-[#1A1F2C] text-white border border-[#7E69AB]/20 shadow-lg transition-all duration-300"
      >
        <File className="mr-2 h-4 w-4" />
        Create New Note
      </Button>
    </div>
  );
}
