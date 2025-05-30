
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { selectedEntityAtom, pinnedEntitiesAtom, SelectedEntity } from '@/lib/entityDetailStore';
import { rightSidebarContentAtom } from '@/lib/rightSidebarStore';
import { useRightSidebar } from '@/components/RightSidebarProvider';
import { copyEntityUrl } from '@/lib/entityUrlUtils';
import { toast } from 'sonner';

export function useEntityActions() {
  const [, setSelectedEntity] = useAtom(selectedEntityAtom);
  const [rightSidebarContent, setRightSidebarContent] = useAtom(rightSidebarContentAtom);
  const [pinnedEntities, setPinnedEntities] = useAtom(pinnedEntitiesAtom);
  const rightSidebar = useRightSidebar();

  const openEntityInSidebar = useCallback((entity: SelectedEntity) => {
    setSelectedEntity(entity);
    setRightSidebarContent('entity-detail');
    if (!rightSidebar.open) {
      rightSidebar.setOpen(true);
    }
  }, [setSelectedEntity, setRightSidebarContent, rightSidebar]);

  const openEntityInNewTab = useCallback((entity: SelectedEntity) => {
    const url = `/entity/${encodeURIComponent(entity.kind.toLowerCase())}/${encodeURIComponent(entity.label)}`;
    window.open(url, '_blank');
  }, []);

  const copyEntityLink = useCallback((entity: SelectedEntity) => {
    copyEntityUrl(entity);
    toast.success("Link copied to clipboard");
  }, []);

  const pinEntity = useCallback((entity: SelectedEntity) => {
    const isAlreadyPinned = pinnedEntities.some(
      p => p.kind === entity.kind && p.label === entity.label
    );

    if (isAlreadyPinned) {
      setPinnedEntities(prev => prev.filter(
        p => !(p.kind === entity.kind && p.label === entity.label)
      ));
      toast.success(`${entity.label} removed from pinned entities`);
    } else {
      setPinnedEntities(prev => [...prev, entity]);
      toast.success(`${entity.label} added to pinned entities`);
    }
  }, [pinnedEntities, setPinnedEntities]);

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
