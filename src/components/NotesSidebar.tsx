import { useAtom } from 'jotai';
import { Plus, Search, Tag, FolderIcon, FileIcon, Layers } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  createNote, 
  notesAtom,
  activeNoteIdAtom,
  currentFolderPathAtom,
  foldersAtom,
  getBreadcrumbsFromPath,
  viewModeAtom,
  currentClusterIdAtom,
} from '@/lib/store';
import { Input } from '@/components/ui/input';
import { FolderTree } from './FolderTree';
import { ClusterView } from './ClusterView';
import { toast } from 'sonner';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export function NotesSidebar() {
  const [notes, setNotes] = useAtom(notesAtom);
  const [folders] = useAtom(foldersAtom);
  const [activeNoteId, setActiveNoteId] = useAtom(activeNoteIdAtom);
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [currentClusterId] = useAtom(currentClusterIdAtom);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewNote = useCallback(() => {
    const { id, note } = createNote(
      currentPath, 
      viewMode === 'clusters' ? currentClusterId : undefined
    );
    
    setNotes(prevNotes => [...prevNotes, note]);
    setActiveNoteId(id);
    toast("New note created", {
      description: "Start typing to edit your note",
    });
  }, [setNotes, setActiveNoteId, currentPath, currentClusterId, viewMode]);

  const breadcrumbs = getBreadcrumbsFromPath(currentPath, folders);

  const filteredNotes = searchQuery.trim() 
    ? notes.filter(note => 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value as 'folders' | 'clusters');
    setCurrentPath('/');
  };

  return (
    <div className="w-64 dark:cosmic-sidebar-dark light:cosmic-sidebar-light h-full flex flex-col">
      <div className="p-4">
        <div className="relative">
          <Input
            placeholder="Search notes..."
            className="pl-8 dark:bg-galaxy-dark-accent dark:border-galaxy-dark-purple dark:border-opacity-30 light:bg-white"
            value={searchQuery}
            onChange={handleSearch}
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      <Separator className="dark:bg-galaxy-dark-purple dark:bg-opacity-30 light:bg-gray-200" />
      
      <div className="p-4">
        <Button 
          onClick={handleNewNote} 
          className="w-full dark:cosmic-button-dark light:cosmic-button-light group"
        >
          <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> New Note
        </Button>
      </div>
      
      <Separator className="dark:bg-galaxy-dark-purple dark:bg-opacity-30 light:bg-gray-200" />

      <div className="px-4 py-2">
        <Tabs value={viewMode} onValueChange={handleViewModeChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="folders" className="flex-1">
              <FolderIcon className="h-3.5 w-3.5 mr-1" />
              Folders
            </TabsTrigger>
            <TabsTrigger value="clusters" className="flex-1">
              <Layers className="h-3.5 w-3.5 mr-1" />
              Clusters
            </TabsTrigger>
          </TabsList>

          <div className="space-y-2 mt-2">
            {viewMode === 'folders' && breadcrumbs.length > 1 && (
              <div className="px-0 py-2">
                <div className="flex flex-wrap gap-1 items-center">
                  {breadcrumbs.map((crumb, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent truncate max-w-[100px]"
                      onClick={() => setCurrentPath(crumb.path)}
                    >
                      {index === 0 ? <FolderIcon className="h-3 w-3 mr-1" /> : null}
                      {crumb.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.trim() !== '' && (
              <div className="px-0 py-2">
                <div className="text-xs font-medium text-muted-foreground py-1">
                  Search Results ({filteredNotes.length})
                </div>
                <ScrollArea className="max-h-40">
                  {filteredNotes.length > 0 ? (
                    filteredNotes.map(note => (
                      <div 
                        key={note.id}
                        className="flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent rounded-md"
                        onClick={() => {
                          setActiveNoteId(note.id);
                          setCurrentPath(note.path);
                          if (note.clusterId && note.clusterId !== 'default-cluster') {
                            setViewMode('clusters');
                          }
                        }}
                      >
                        <FileIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <span className="truncate">{note.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground p-2">No results found</div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
          
          <TabsContent value="folders" className="flex-1 flex flex-col">
            <div className="px-2 py-1">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">FOLDERS</div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="py-2">
                <FolderTree parentId={null} path="/" level={0} viewMode="folders" />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="clusters" className="flex-1 flex flex-col">
            <div className="px-2 py-1">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">CLUSTERS</div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="py-2">
                <ClusterView />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      
      <Separator className="dark:bg-galaxy-dark-purple dark:bg-opacity-30 light:bg-gray-200 mt-auto" />
      
      <div className="p-3">
        <Button 
          variant="outline" 
          className="w-full flex items-center dark:border-galaxy-dark-purple dark:border-opacity-30 dark:bg-galaxy-dark-accent dark:hover:bg-galaxy-dark-purple dark:hover:bg-opacity-50 light:border-gray-200 light:bg-white light:hover:bg-gray-100" 
          size="sm"
        >
          <Tag className="mr-2 h-3 w-3" /> Manage Tags
        </Button>
      </div>
    </div>
  );
}
