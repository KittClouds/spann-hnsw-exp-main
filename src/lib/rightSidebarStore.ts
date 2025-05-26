
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Right sidebar specific state - completely independent from left sidebar
export const rightSidebarOpenAtom = atom<boolean>(false);

// Content type for the right sidebar - extended to include attributes
export type RightSidebarContentType = 'empty' | 'entities' | 'connections' | 'graph' | 'attributes';

export const rightSidebarContentAtom = atomWithStorage<RightSidebarContentType>('galaxy-right-sidebar-content', 'empty');

// Mobile state for right sidebar
export const rightSidebarMobileAtom = atom<boolean>(false);

// Selected entity for attribute display
export interface SelectedEntity {
  kind: string;
  label: string;
}

export const selectedEntityAtom = atom<SelectedEntity | null>(null);

// Entity display mode
export type EntityDisplayMode = 'compact' | 'detailed' | 'categories';
export const entityDisplayModeAtom = atom<EntityDisplayMode>('detailed');
