
import { useState, useEffect } from 'react';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { entityActions, entityUrlHelpers } from '@/lib/entityActions';
import { useAtom } from 'jotai';
import { rightSidebarContentAtom, rightSidebarOpenAtom } from '@/lib/rightSidebarStore';

export type EntityDetailMode = 'modal' | 'sidebar';

export function useEntityActions() {
  const [selectedEntity, setSelectedEntityState] = useState<EntityWithReferences | null>(
    entityActions.getSelectedEntity()
  );
  const [detailMode, setDetailMode] = useState<EntityDetailMode>('modal');
  const [modalOpen, setModalOpen] = useState(false);
  const [, setRightSidebarContent] = useAtom(rightSidebarContentAtom);
  const [, setRightSidebarOpen] = useAtom(rightSidebarOpenAtom);

  // Subscribe to entity selection changes
  useEffect(() => {
    const unsubscribe = entityActions.onEntitySelectionChange((entity) => {
      setSelectedEntityState(entity);
    });
    return unsubscribe;
  }, []);

  const selectEntity = (entity: EntityWithReferences, mode: EntityDetailMode = detailMode) => {
    entityActions.setSelectedEntity(entity);
    
    if (mode === 'sidebar') {
      setRightSidebarContent('entity-detail');
      setRightSidebarOpen(true);
      entityUrlHelpers.updateUrlWithEntity(entity);
    } else {
      setModalOpen(true);
    }
  };

  const clearSelection = () => {
    entityActions.clearSelection();
    setModalOpen(false);
    setRightSidebarOpen(false);
    entityUrlHelpers.clearEntityFromUrl();
  };

  const closeModal = () => {
    setModalOpen(false);
    entityActions.clearSelection();
  };

  return {
    selectedEntity,
    detailMode,
    setDetailMode,
    modalOpen,
    selectEntity,
    clearSelection,
    closeModal
  };
}
