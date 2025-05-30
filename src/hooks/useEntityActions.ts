
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { selectedEntityAtom, pinnedEntitiesAtom, SelectedEntity } from '@/lib/entityDetailStore';
import { rightSidebarContentAtom } from '@/lib/rightSidebarStore';
import { useRightSidebar } from '@/components/RightSidebarProvider';
import { copyEntityUrl } from '@/lib/entityUrlUtils';
import { useToast } from '@/hooks/use-toast';

export function useEntityActions() {
  const [, setSelectedEntity] = useAtom(selectedEntityAtom);
  const [, setRightSidebarContent] = useAtom(rightSidebarContentAtom);
  const [pinnedEntities, setPinnedEntities] = useAtom(pinnedEntitiesAtom);
  const { open: rightSidebarOpen, setOpen: setRightSidebarOpen } = useRightSidebar();
  const { toast } = useToast();

  const openEntityInSidebar = useCallback((entity: SelectedEntity) => {
    setSelectedEntity(entity);
    setRightSidebarContent('entity-detail');
    if (!rightSidebarOpen) {
      setRightSidebarOpen(true);
    }
  }, [setSelectedEntity, setRightSidebarContent, rightSidebarOpen, setRightSidebarOpen]);

  const openEntityInNewTab = useCallback((entity: SelectedEntity) => {
    const url = `/entity/${encodeURIComponent(entity.kind.toLowerCase())}/${encodeURIComponent(entity.label)}`;
    window.open(url, '_blank');
  }, []);

  const copyEntityLink = useCallback((entity: SelectedEntity) => {
    copyEntityUrl(entity);
    toast({
      title: "Link copied",
      description: `Entity link copied to clipboard`,
    });
  }, [toast]);

  const pinEntity = useCallback((entity: SelectedEntity) => {
    const isAlreadyPinned = pinnedEntities.some(
      p => p.kind === entity.kind && p.label === entity.label
    );
    
    if (isAlreadyPinned) {
      setPinnedEntities(prev => prev.filter(
        p => !(p.kind === entity.kind && p.label === entity.label)
      ));
      toast({
        title: "Entity unpinned",
        description: `${entity.label} removed from pinned entities`,
      });
    } else {
      setPinnedEntities(prev => [...prev, entity]);
      toast({
        title: "Entity pinned",
        description: `${entity.label} added to pinned entities`,
      });
    }
  }, [pinnedEntities, setPinnedEntities, toast]);

  const isEntityPinned = useCallback((entity: SelectedEntity) => {
    return pinnedEntities.some(
      p => p.kind === entity.kind && p.label === entity.label
    );
  }, [pinnedEntities]);

  return {
    openEntityInSidebar,
    openEntityInNewTab,
    copyEntityLink,
    pinEntity,
    isEntityPinned
  };
}
