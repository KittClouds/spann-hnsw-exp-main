
import * as React from "react";
import { useAtom } from "jotai";
import { 
  Cluster,
  clustersAtom, 
  activeClusterIdAtom,
  createClusterFolder,
  deleteClusterFolder
} from "@/lib/store";
import { 
  ChevronRight, 
  Folder, 
  Plus, 
  Edit, 
  Trash
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "./ui/input";
import { toast } from "sonner";

interface ClusterTreeItemProps {
  cluster: Cluster;
  clusters: Cluster[];
  activeClusterId: string;
  onSelect: (id: string) => void;
  onNewFolder: (parentId: string | null) => void;
  onEdit: (cluster: Cluster) => void;
  onDelete: (clusterId: string) => void;
}

export function ClusterTreeItem({
  cluster,
  clusters,
  activeClusterId,
  onSelect,
  onNewFolder,
  onEdit,
  onDelete
}: ClusterTreeItemProps) {
  const children = clusters.filter(c => c.parentId === cluster.id);
  const isCluster = cluster.type === 'cluster';
  const isFolder = cluster.type === 'folder';

  if (isCluster) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={activeClusterId === cluster.id}
          onClick={() => onSelect(cluster.id)}
          className="flex justify-between"
        >
          <div className="flex items-center">
            <Folder className="shrink-0" />
            <span className="truncate ml-2">{cluster.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(cluster);
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onNewFolder(cluster.id);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </SidebarMenuButton>
        {children.length > 0 && (
          <SidebarMenuSub>
            {children.map((child) => (
              <ClusterTreeItem
                key={child.id}
                cluster={child}
                clusters={clusters}
                activeClusterId={activeClusterId}
                onSelect={onSelect}
                onNewFolder={onNewFolder}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  if (isFolder) {
    return (
      <SidebarMenuItem>
        <Collapsible defaultOpen>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="[&[data-state=open]>svg:first-child]:rotate-90 flex justify-between">
              <div className="flex items-center">
                <ChevronRight className="shrink-0 transition-transform" />
                <Folder className="shrink-0" />
                <span className="truncate ml-2">{cluster.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(cluster);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{cluster.title}"? This will also delete all folders within this folder.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => onDelete(cluster.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-full justify-start px-2 hover:bg-accent/50">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Folder
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onNewFolder(cluster.id)}>
                    <Folder className="mr-2 h-4 w-4" />
                    New Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {children.map((child) => (
                <ClusterTreeItem
                  key={child.id}
                  cluster={child}
                  clusters={clusters}
                  activeClusterId={activeClusterId}
                  onSelect={onSelect}
                  onNewFolder={onNewFolder}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  }

  return null;
}

export function ClusterTree() {
  const [clusters, setClusters] = useAtom(clustersAtom);
  const [activeClusterId, setActiveClusterId] = useAtom(activeClusterIdAtom);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingCluster, setEditingCluster] = React.useState<Cluster | null>(null);
  const [newClusterName, setNewClusterName] = React.useState("");

  const rootClusters = clusters.filter(cluster => cluster.parentId === null);

  const handleNewFolder = (parentId: string | null = null) => {
    const { cluster } = createClusterFolder(parentId);
    setClusters([...clusters, cluster]);
    toast("New folder created", {
      description: "You can organize your clusters in this folder",
    });
  };

  const handleEditCluster = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCluster || !newClusterName.trim()) return;
    
    const updatedClusters = clusters.map(cluster => 
      cluster.id === editingCluster.id 
        ? { ...cluster, title: newClusterName, updatedAt: new Date().toISOString() } 
        : cluster
    );
    
    setClusters(updatedClusters);
    setEditDialogOpen(false);
    setNewClusterName("");
    setEditingCluster(null);
    
    toast(editingCluster.type === 'folder' ? "Folder renamed" : "Cluster renamed", {
      description: `${editingCluster.type === 'folder' ? 'Folder' : 'Cluster'} renamed to "${newClusterName}"`,
    });
  };

  const handleDeleteFolder = (folderId: string) => {
    setClusters(prevClusters => deleteClusterFolder(prevClusters, folderId));
    
    toast("Folder deleted", {
      description: "The folder and all contained folders have been removed",
    });
  };

  const openEditDialog = (cluster: Cluster) => {
    setEditingCluster(cluster);
    setNewClusterName(cluster.title);
    setEditDialogOpen(true);
  };

  return (
    <div>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <SidebarMenu>
          {rootClusters.map((cluster) => (
            <ClusterTreeItem
              key={cluster.id}
              cluster={cluster}
              clusters={clusters}
              activeClusterId={activeClusterId}
              onSelect={setActiveClusterId}
              onNewFolder={handleNewFolder}
              onEdit={openEditDialog}
              onDelete={handleDeleteFolder}
            />
          ))}
          
          <SidebarMenuItem>
            <Button 
              variant="outline" 
              className="w-full justify-start mb-2 mt-4"
              onClick={() => handleNewFolder(null)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Root Folder
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCluster?.type === 'folder' ? 'Edit Folder' : 'Edit Cluster'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCluster}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder={editingCluster?.type === 'folder' ? 'Folder name' : 'Cluster name'}
                  value={newClusterName}
                  onChange={(e) => setNewClusterName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
