
import { atom, useAtom, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { rightSidebarContentAtom, RightSidebarContentType } from '@/lib/rightSidebarStore';
import { useRightSidebar } from '@/components/RightSidebarProvider';

// Selected entity atom for universal entity inspection
export const selectedEntityAtom = atom<EntityWithReferences | null>(null);

// Entity detail mode atom - controls how entity details are displayed
export type EntityDetailMode = 'modal' | 'sidebar';
export const entityDetailModeAtom = atomWithStorage<EntityDetailMode>('galaxy-entity-detail-mode', 'modal');

// Hook for managing entity selection
export function useEntitySelection() {
  const [selectedEntity, setSelectedEntity] = useAtom(selectedEntityAtom);
  const [detailMode, setDetailMode] = useAtom(entityDetailModeAtom);
  const { setOpen: setRightSidebarOpen } = useRightSidebar();
  const setRightSidebarContent = useSetAtom(rightSidebarContentAtom);

  const selectEntity = (entity: EntityWithReferences, mode?: EntityDetailMode) => {
    setSelectedEntity(entity);
    
    const targetMode = mode || detailMode;
    
    if (targetMode === 'sidebar') {
      setRightSidebarContent('entity-detail' as RightSidebarContentType);
      setRightSidebarOpen(true);
    }
    // For modal mode, the consuming component handles the modal state
  };

  const clearSelection = () => {
    setSelectedEntity(null);
  };

  return {
    selectedEntity,
    detailMode,
    setDetailMode,
    selectEntity,
    clearSelection
  };
}
