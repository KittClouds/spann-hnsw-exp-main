
import * as React from "react";
import { useAtom } from "jotai";
import { Cluster, clustersAtom, activeClusterIdAtom, createCluster, deleteCluster, notesAtom } from "@/lib/store";
import { Check, ChevronsUpDown, Edit, Plus, Trash, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ClusterSelector() {
  const [clusters, setClusters] = useAtom(clustersAtom);
  const [activeClusterId, setActiveClusterId] = useAtom(activeClusterIdAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  
  const [open, setOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingCluster, setEditingCluster] = React.useState<Cluster | null>(null);
  const [newClusterName, setNewClusterName] = React.useState("");

  const activeCluster = clusters.find(cluster => cluster.id === activeClusterId) || clusters[0];

  const handleCreateCluster = () => {
    const newCluster = createCluster();
    setClusters([...clusters, newCluster]);
    setActiveClusterId(newCluster.id);
    toast("New cluster created", {
      description: "You can add notes to this cluster now",
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
    
    toast("Cluster renamed", {
      description: `Cluster renamed to "${newClusterName}"`,
    });
  };

  const handleDeleteCluster = (clusterId: string) => {
    // Make sure we're not deleting the last cluster
    if (clusters.length <= 1) {
      toast("Cannot delete", {
        description: "You must keep at least one cluster",
      });
      return;
    }

    const result = deleteCluster(clusters, notes, clusterId);
    setClusters(result.clusters);
    setNotes(result.notes);
    
    // If we're deleting the active cluster, switch to another one
    if (activeClusterId === clusterId) {
      const newActiveId = result.clusters[0]?.id;
      if (newActiveId) {
        setActiveClusterId(newActiveId);
      }
    }
    
    toast("Cluster deleted", {
      description: "Cluster and all its notes have been removed",
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {activeCluster?.title}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search clusters..." />
              <CommandEmpty>No clusters found.</CommandEmpty>
              <CommandGroup>
                {clusters.map((cluster) => (
                  <CommandItem
                    key={cluster.id}
                    value={cluster.title}
                    onSelect={() => {
                      setActiveClusterId(cluster.id);
                      setOpen(false);
                    }}
                    className="flex justify-between"
                  >
                    <span>{cluster.title}</span>
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          activeClusterId === cluster.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(cluster);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {clusters.length > 1 && (
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
                              <AlertDialogTitle>Delete Cluster</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{cluster.title}"? This will also delete all notes within this cluster.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteCluster(cluster.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <div className="p-2 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleCreateCluster}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Cluster
                </Button>
              </div>
            </Command>
          </PopoverContent>
        </Popover>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cluster</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCluster}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Cluster name"
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
