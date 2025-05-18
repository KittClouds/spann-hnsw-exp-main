
import React from 'react';
import { EntityBrowserDrawer } from './EntityBrowserDrawer';
import { EntityBrowserMobileDrawer } from './EntityBrowserMobileDrawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveEntityBrowserTriggerProps {
  triggerClassName?: string;
}

export function ResponsiveEntityBrowserTrigger({ triggerClassName }: ResponsiveEntityBrowserTriggerProps) {
  const isMobile = useIsMobile();
  
  return isMobile ? (
    <EntityBrowserMobileDrawer triggerClassName={triggerClassName} />
  ) : (
    <EntityBrowserDrawer triggerClassName={triggerClassName} />
  );
}
