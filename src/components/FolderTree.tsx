
import { FolderTree as InternalFolderTree } from './folder-tree/FolderTree';
import { FolderTreeProps } from './folder-tree/types';

export function FolderTree(props: FolderTreeProps) {
  // Add default viewMode if not provided
  const enhancedProps = {
    ...props,
    viewMode: props.viewMode || (props.clusterId ? 'clusters' : 'folders')
  };
  
  return <InternalFolderTree {...enhancedProps} />;
}

export { type FolderTreeProps } from './folder-tree/types';
