
import React from 'react';
import { EntityBrowserDrawer } from './EntityBrowserDrawer';
import { EntityBrowserMobileDrawer } from './EntityBrowserMobileDrawer';
import { useMobile } from '@/hooks/use-mobile';

interface ResponsiveEntityBrowserTriggerProps {
  triggerClassName?: string;
}

export function ResponsiveEntityBrowserTrigger({ triggerClassName }: ResponsiveEntityBrowserTriggerProps) {
  const isMobile = useMobile();
  
  return isMobile ? (
    <EntityBrowserMobileDrawer triggerClassName={triggerClassName} />
  ) : (
    <EntityBrowserDrawer triggerClassName={triggerClassName} />
  );
}
