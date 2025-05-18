
import React from 'react';
import { Database } from 'lucide-react';
import { 
  Drawer, 
  DrawerContent,
  DrawerTrigger
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { EntityBrowser } from './EntityBrowser';

interface EntityBrowserMobileDrawerProps {
  triggerClassName?: string;
}

export function EntityBrowserMobileDrawer({ 
  triggerClassName 
}: EntityBrowserMobileDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={triggerClassName}
          title="Entity Browser"
        >
          <Database className="h-5 w-5" />
          <span className="sr-only">Entity Browser</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[85vh] p-0 pt-6">
        <div className="h-full px-4 overflow-y-auto">
          <EntityBrowser />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
