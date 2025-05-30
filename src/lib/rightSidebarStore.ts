
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Right sidebar specific state - completely independent from left sidebar
export const rightSidebarOpenAtom = atom<boolean>(false);

// Content type for the right sidebar - extended to include entity detail
export type RightSidebarContentType = 'empty' | 'entities' | 'connections' | 'graph' | 'entity-attributes' | 'entity-detail';

// Create a base atom for the content type with explicit typing
const _rightSidebarContentBaseAtom = atomWithStorage<RightSidebarContentType>('galaxy-right-sidebar-content', 'empty');

// Export a writable derived atom to ensure proper typing
export const rightSidebarContentAtom = atom(
  (get) => get(_rightSidebarContentBaseAtom),
  (get, set, newValue: RightSidebarContentType) => {
    set(_rightSidebarContentBaseAtom, newValue);
  }
);

// Mobile state for right sidebar
export const rightSidebarMobileAtom = atom<boolean>(false);
