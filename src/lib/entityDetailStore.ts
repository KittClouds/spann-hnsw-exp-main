
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Selected entity for detail view
export interface SelectedEntity {
  kind: string;
  label: string;
  id?: string;
}

export const selectedEntityAtom = atom<SelectedEntity | null>(null);

// Entity detail display mode
export type EntityDetailMode = 'sidebar' | 'modal' | 'page';
export const entityDetailModeAtom = atom<EntityDetailMode>('sidebar');

// Entity detail tab state
export const entityDetailActiveTabAtom = atomWithStorage('entity-detail-active-tab', 'attributes');

// Entity pinning/bookmarking
export const pinnedEntitiesAtom = atomWithStorage<SelectedEntity[]>('pinned-entities', []);
