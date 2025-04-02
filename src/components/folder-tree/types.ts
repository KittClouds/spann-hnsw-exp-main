
export interface FolderTreeProps {
  parentId: string | null;
  path: string;
  level: number;
  clusterId?: string;
  viewMode?: 'folders' | 'clusters';
}
