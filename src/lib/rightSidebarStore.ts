
import { atom } from 'jotai';

// Right sidebar specific state - completely independent from left sidebar
export const rightSidebarOpenAtom = atom<boolean>(false);

// Content type for the right sidebar - simplified
export type RightSidebarContentType = 'empty' | 'entities' | 'connections' | 'graph' | 'entity-attributes' | 'entity-detail';

// Simple atom for content type
export const rightSidebarContentAtom = atom<RightSidebarContentType>('empty');

// Mobile state for right sidebar
export const rightSidebarMobileAtom = atom<boolean>(false);
