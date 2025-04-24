
import { ThemeToggle } from "./ThemeToggle";
import { NoteEditor } from "./NoteEditor";
import { AppSidebar } from "./AppSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { useAtom } from 'jotai';
import { activeNoteAtom, activeClusterAtom, clustersAtom, activeClusterIdAtom } from '@/lib/store';
import { useMemo } from "react";

export function GalaxyNotes() {
  const [activeNote] = useAtom(activeNoteAtom);
  const [activeCluster] = useAtom(activeClusterAtom);
  const [clusters] = useAtom(clustersAtom);
  const [activeClusterId, setActiveClusterId] = useAtom(activeClusterIdAtom);

  // Generate breadcrumb trail for clusters
  const clusterTrail = useMemo(() => {
    if (!activeCluster) return [];
    
    const trail = [];
    let currentId = activeCluster.id;
    let current = activeCluster;
    
    // Add the current cluster
    trail.unshift(current);
    
    // Add all parent clusters
    while (current.parentId) {
      const parent = clusters.find(c => c.id === current.parentId);
      if (!parent) break;
      
      trail.unshift(parent);
      current = parent;
    }
    
    return trail;
  }, [activeCluster, clusters]);

  const handleBreadcrumbClick = (clusterId: string) => {
    setActiveClusterId(clusterId);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gradient-to-b dark:from-[#0f101a] dark:to-[#171926] light:from-white light:to-[#f8f6ff] text-foreground">
        <AppSidebar />
        <SidebarInset>
          <header className="border-b border-border p-4 flex items-center justify-between bg-opacity-95 backdrop-blur-sm dark:bg-black/30 light:bg-white/70">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-6 mx-2" />
              <Breadcrumb>
                <BreadcrumbList>
                  {clusterTrail.length > 0 && clusterTrail.map((cluster, index) => (
                    <BreadcrumbItem key={cluster.id}>
                      {index < clusterTrail.length - 1 ? (
                        <>
                          <BreadcrumbLink onClick={() => handleBreadcrumbClick(cluster.id)}>
                            {cluster.title}
                          </BreadcrumbLink>
                          <BreadcrumbSeparator />
                        </>
                      ) : (
                        <BreadcrumbPage>{cluster.title}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  ))}
                  {activeNote && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{activeNote.title || "Untitled Note"}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text dark:bg-gradient-to-r dark:from-[#9b87f5] dark:to-[#7c5bf1] light:bg-gradient-to-r light:from-[#614ac2] light:to-[#7460db]">Galaxy Notes</h1>
              <p className="text-sm text-muted-foreground">Multi-note block editor with automatic saving</p>
            </div>
            <div>
              <ThemeToggle />
            </div>
          </header>
          
          <main className="flex-1 overflow-hidden">
            <NoteEditor />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
