
import { Folder } from '@/lib/store';

export interface FolderTreeProps {
  parentId: string | null;
  path: string;
  level: number;
}

export interface FolderItemProps {
  folder: Folder;
  isExpanded: boolean;
  isCurrentPath: boolean;
  hoveredFolderId: string | null;
  toggleFolder: (folderId: string) => void;
  handleFolderClick: (folderPath: string) => void;
  openNewFolderDialog: (parentFolderId: string | null, folderPath: string) => void;
  openRenameFolderDialog: (folder: Folder, e: React.MouseEvent) => void;
  handleDeleteClick: (folder: Folder, e: React.MouseEvent) => void;
  handleCreateNote: (folderPath: string, e: React.MouseEvent) => void;
  setHoveredFolderId: (id: string | null) => void;
}

export interface NoteItemProps {
  noteId: string;
  title: string;
  path: string;
  isActive: boolean;
  hoveredNoteId: string | null;
  movePopoverOpenForNoteId: string | null;
  allFolders: { id: string; name: string; path: string; }[];
  handleNoteClick: (noteId: string) => void;
  handleDeleteNote: (noteId: string, e: React.MouseEvent) => void;
  toggleMovePopover: (noteId: string, e: React.MouseEvent) => void;
  handleMoveNote: (noteId: string, targetFolderPath: string, e: React.MouseEvent) => void;
  setHoveredNoteId: (id: string | null) => void;
}

export interface FolderFormProps {
  isOpen: boolean;
  title: string;
  folderName: string;
  setFolderName: (name: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export interface DeleteFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
