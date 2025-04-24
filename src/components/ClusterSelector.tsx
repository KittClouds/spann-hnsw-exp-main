
import * as React from "react";
import { useAtom } from "jotai";
import { Cluster, clustersAtom, activeClusterIdAtom, createCluster, deleteCluster, notesAtom } from "@/lib/store";
import { Check, ChevronsUpDown, Layers, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ClusterSelector() {
  const [clusters, setClusters] = useAtom(clustersAtom);
  const [activeClusterId, setActiveClusterId] = useAtom(activeClusterIdAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  
  const [open, setOpen] = React.useState(false);

  // Filter only actual clusters (not folders) that are at the root level
  const rootClusters = clusters.filter(cluster => 
    cluster.type === 'cluster' && cluster.parentId === null
  ) || [];
  
  const activeCluster = clusters.find(cluster => cluster.id === activeClusterId) || clusters[0] || { title: "No Cluster Selected" };

  const handleCreateCluster = () => {
    const newCluster = createCluster();
    setClusters([...clusters, newCluster]);
    setActiveClusterId(newCluster.id);
    toast("New cluster created", {
      description: "You can add notes to this cluster now",
    });
  };

  const handleDeleteCluster = (clusterId: string) => {
    // Make sure we're not deleting the last cluster
    if (rootClusters.length <= 1) {
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

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {activeCluster?.title || "Select Cluster"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search clusters..." />
            <CommandEmpty>No clusters found.</CommandEmpty>
            <CommandGroup>
              {rootClusters.length > 0 ? (
                rootClusters.map((cluster) => (
                  <CommandItem
                    key={cluster.id}
                    value={cluster.title || ""}
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
                    </div>
                  </CommandItem>
                ))
              ) : (
                <CommandItem disabled>No clusters available</CommandItem>
              )}
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
    </div>
  );
}
