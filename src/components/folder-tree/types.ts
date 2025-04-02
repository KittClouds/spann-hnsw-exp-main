
export interface FolderTreeProps {
  parentId: string | null;
  path: string;
  level: number;
  clusterId?: string;
  viewMode?: 'folders' | 'clusters';
}

export interface FolderItemProps {
  folder: {
    id: string;
    name: string;
    path: string;
    parentId: string | null;
    clusterId?: string;
  };
  isExpanded: boolean;
  isCurrentPath: boolean;
  hoveredFolderId: string | null;
  toggleFolder: (folderId: string) => void;
  handleFolderClick: (folderPath: string, clusterId?: string) => void;
  openNewFolderDialog: (folderId: string, folderPath: string, clusterId?: string) => void;
  openRenameFolderDialog: (folder: any, e: React.MouseEvent) => void;
  handleDeleteClick: (folder: any, e: React.MouseEvent) => void;
  handleCreateNote: (folderPath: string, e: React.MouseEvent, clusterId?: string) => void;
  setHoveredFolderId: (folderId: string | null) => void;
}

export interface NoteItemProps {
  noteId: string;
  title: string;
  path: string;
  clusterId?: string;
  isActive: boolean;
  hoveredNoteId: string | null;
  movePopoverOpenForNoteId: string | null;
  allFolders: Array<{
    id: string;
    name: string;
    path: string;
    clusterId?: string;
  }>;
  handleNoteClick: (noteId: string, clusterId?: string) => void;
  handleDeleteNote: (noteId: string, e: React.MouseEvent) => void;
  toggleMovePopover: (noteId: string, e: React.MouseEvent) => void;
  handleMoveNote: (noteId: string, targetFolderPath: string, e: React.MouseEvent, targetClusterId?: string) => void;
  setHoveredNoteId: (noteId: string | null) => void;
}

export interface ClusterItemProps {
  cluster: {
    id: string;
    name: string;
  };
  isExpanded: boolean;
  isActive: boolean;
  hoveredClusterId: string | null;
  toggleCluster: (clusterId: string) => void;
  handleClusterClick: (clusterId: string) => void;
  openRenameClusterDialog: (cluster: any, e: React.MouseEvent) => void;
  handleDeleteClick: (cluster: any, e: React.MouseEvent) => void;
  handleCreateFolder: (clusterId: string, e: React.MouseEvent) => void;
  handleCreateNote: (clusterId: string, e: React.MouseEvent) => void;
  setHoveredClusterId: (clusterId: string | null) => void;
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
