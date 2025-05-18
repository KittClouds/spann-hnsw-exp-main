
import React from 'react';
import { Database } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { EntityBrowser } from './EntityBrowser';

interface EntityBrowserDrawerProps {
  side?: "left" | "right" | "top" | "bottom";
  size?: "default" | "large";
  triggerClassName?: string;
}

export function EntityBrowserDrawer({ 
  side = "right", 
  size = "large",
  triggerClassName 
}: EntityBrowserDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={triggerClassName}
          title="Entity Browser"
        >
          <Database className="h-5 w-5" />
          <span className="sr-only">Entity Browser</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side={side} 
        className={`${size === "large" ? "sm:max-w-xl md:max-w-2xl" : ""} p-0 pt-6 overflow-y-auto`}
      >
        <div className="h-full px-4">
          <EntityBrowser />
        </div>
      </SheetContent>
    </Sheet>
  );
}
