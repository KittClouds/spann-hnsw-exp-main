
import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { Cluster, clustersAtom, createCluster, deleteCluster, renameCluster, createFolder, createNote, notesAtom, foldersAtom, currentClusterIdAtom } from '@/lib/store';
import { ClusterItem } from './folder-tree/ClusterItem';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FolderForm } from './folder-tree/FolderForm';
import { DeleteFolderDialog } from './folder-tree/DeleteFolderDialog';
import { toast } from 'sonner';

export function ClusterView() {
  const [clusters, setClusters] = useAtom(clustersAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const [folders, setFolders] = useAtom(foldersAtom);
  const [currentClusterId, setCurrentClusterId] = useAtom(currentClusterIdAtom);
  
  // UI state
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);
  
  // Dialog state
  const [isNewClusterDialogOpen, setIsNewClusterDialogOpen] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');
  
  const [isRenameClusterDialogOpen, setIsRenameClusterDialogOpen] = useState(false);
  const [clusterToRename, setClusterToRename] = useState<Cluster | null>(null);
  const [newRenameClusterName, setNewRenameClusterName] = useState('');
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState<Cluster | null>(null);

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters(prev => ({
      ...prev, 
      [clusterId]: !prev[clusterId]
    }));
  };

  const isExpanded = (clusterId: string) => {
    return expandedClusters[clusterId] || false;
  };

  const handleClusterClick = (clusterId: string) => {
    setCurrentClusterId(clusterId);
  };

  // New cluster dialog functions
  const openNewClusterDialog = () => {
    setNewClusterName('');
    setIsNewClusterDialogOpen(true);
  };

  const closeNewClusterDialog = () => {
    setIsNewClusterDialogOpen(false);
  };

  const handleCreateCluster = () => {
    if (!newClusterName.trim()) {
      toast.error('Cluster name cannot be empty');
      return;
    }

    // Check if cluster name already exists
    const clusterExists = clusters.some(
      cluster => cluster.name.toLowerCase() === newClusterName.toLowerCase()
    );

    if (clusterExists) {
      toast.error('A cluster with this name already exists');
      return;
    }

    const { id, cluster } = createCluster(newClusterName);
    setClusters([...clusters, cluster]);
    setIsNewClusterDialogOpen(false);
    
    // Auto-expand the new cluster
    setExpandedClusters(prev => ({
      ...prev,
      [id]: true
    }));
    
    toast.success('Cluster created successfully');
  };

  // Rename cluster dialog functions
  const openRenameClusterDialog = (cluster: Cluster, e: React.MouseEvent) => {
    e.stopPropagation();
    setClusterToRename(cluster);
    setNewRenameClusterName(cluster.name);
    setIsRenameClusterDialogOpen(true);
  };

  const closeRenameClusterDialog = () => {
    setIsRenameClusterDialogOpen(false);
    setClusterToRename(null);
  };

  const handleRenameCluster = () => {
    if (!clusterToRename) return;
    
    if (!newRenameClusterName.trim()) {
      toast.error('Cluster name cannot be empty');
      return;
    }
    
    // Check if the new name is the same as the old one
    if (clusterToRename.name === newRenameClusterName) {
      setIsRenameClusterDialogOpen(false);
      setClusterToRename(null);
      return;
    }
    
    // Check if cluster name already exists
    const clusterExists = clusters.some(
      cluster => 
        cluster.id !== clusterToRename.id &&
        cluster.name.toLowerCase() === newRenameClusterName.toLowerCase()
    );

    if (clusterExists) {
      toast.error('A cluster with this name already exists');
      return;
    }
    
    const updatedClusters = renameCluster(
      clusters,
      clusterToRename.id,
      newRenameClusterName
    );
    
    setClusters(updatedClusters);
    setIsRenameClusterDialogOpen(false);
    setClusterToRename(null);
    
    toast.success('Cluster renamed successfully');
  };

  // Delete cluster dialog functions
  const handleDeleteClick = (cluster: Cluster, e: React.MouseEvent) => {
    e.stopPropagation();
    setClusterToDelete(cluster);
    setIsDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setClusterToDelete(null);
  };

  const confirmDelete = () => {
    if (!clusterToDelete) return;
    
    // Check if we can delete the cluster
    const { canDelete, clusters: updatedClusters } = deleteCluster(
      clusters,
      folders,
      notes,
      clusterToDelete.id
    );
    
    if (!canDelete) {
      toast.error('Cannot delete a cluster that contains folders or notes');
      setIsDeleteDialogOpen(false);
      setClusterToDelete(null);
      return;
    }
    
    // Update current cluster ID if we're deleting the current cluster
    if (currentClusterId === clusterToDelete.id) {
      // Switch to default cluster or first available cluster
      const defaultCluster = clusters.find(c => c.id === 'default-cluster');
      const firstCluster = clusters.find(c => c.id !== clusterToDelete.id);
      setCurrentClusterId(defaultCluster?.id || firstCluster?.id || 'default-cluster');
    }
    
    setClusters(updatedClusters);
    setIsDeleteDialogOpen(false);
    setClusterToDelete(null);
    
    toast.success('Cluster deleted successfully');
  };

  // Create folder in cluster
  const handleCreateFolder = (clusterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { folder } = createFolder('New Folder', '/', null, clusterId);
    setFolders([...folders, folder]);
    
    // Set as current cluster
    setCurrentClusterId(clusterId);
    
    toast.success('Folder created successfully');
  };

  // Create note in cluster
  const handleCreateNote = (clusterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { id, note } = createNote('/', clusterId);
    setNotes([...notes, note]);
    
    // Set as current cluster
    setCurrentClusterId(clusterId);
    
    toast.success('Note created successfully');
  };

  return (
    <div className="space-y-1">
      {clusters.map(cluster => (
        <ClusterItem
          key={cluster.id}
          cluster={cluster}
          isExpanded={isExpanded(cluster.id)}
          isActive={currentClusterId === cluster.id}
          hoveredClusterId={hoveredClusterId}
          toggleCluster={toggleCluster}
          handleClusterClick={handleClusterClick}
          openRenameClusterDialog={openRenameClusterDialog}
          handleDeleteClick={handleDeleteClick}
          handleCreateFolder={handleCreateFolder}
          handleCreateNote={handleCreateNote}
          setHoveredClusterId={setHoveredClusterId}
        />
      ))}
      
      <div className="flex items-center py-1 px-2 mt-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1"
          onClick={openNewClusterDialog}
        >
          <Plus className="h-3 w-3" /> New Cluster
        </Button>
      </div>
      
      {/* Dialog for creating new clusters */}
      <FolderForm
        isOpen={isNewClusterDialogOpen}
        title="Create new cluster"
        folderName={newClusterName}
        setFolderName={setNewClusterName}
        onClose={closeNewClusterDialog}
        onSubmit={handleCreateCluster}
      />
      
      {/* Dialog for renaming clusters */}
      <FolderForm
        isOpen={isRenameClusterDialogOpen}
        title="Rename cluster"
        folderName={newRenameClusterName}
        setFolderName={setNewRenameClusterName}
        onClose={closeRenameClusterDialog}
        onSubmit={handleRenameCluster}
      />
      
      {/* Alert dialog for confirming cluster deletion */}
      <DeleteFolderDialog
        isOpen={isDeleteDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
