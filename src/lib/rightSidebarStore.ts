
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Right sidebar specific state - completely independent from left sidebar
export const rightSidebarOpenAtom = atom<boolean>(false);

// Content type for the right sidebar - can be extended later
export type RightSidebarContentType = 'empty' | 'entities' | 'connections' | 'graph' | 'entity-attributes';

export const rightSidebarContentAtom = atomWithStorage<RightSidebarContentType>('galaxy-right-sidebar-content', 'empty');

// Mobile state for right sidebar
export const rightSidebarMobileAtom = atom<boolean>(false);
