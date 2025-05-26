
import React from "react";
import { X } from "lucide-react";
import { useAtom } from "jotai";
import { rightSidebarContentAtom } from "@/lib/rightSidebarStore";
import { useRightSidebar } from "@/components/RightSidebarProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EntityAttributeDisplay } from "./entity-attributes/EntityAttributeDisplay";

export function AppRightSidebar() {
  const [contentType] = useAtom(rightSidebarContentAtom);
  const { open, toggleSidebar } = useRightSidebar();

  const renderContent = () => {
    switch (contentType) {
      case 'attributes':
        return <EntityAttributeDisplay />;
      case 'empty':
      default:
        return (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Right sidebar content</p>
              <p className="text-xs mt-1">Coming soon...</p>
            </div>
          </div>
        );
    }
  };

  const getHeaderTitle = () => {
    switch (contentType) {
      case 'attributes':
        return 'Entity Attributes';
      default:
        return 'Right Panel';
    }
  };

  return (
    <div 
      className={cn(
        "fixed top-0 right-0 h-full w-64 bg-black border-l border-[#1a1b23] z-40 transform transition-transform duration-300 ease-in-out flex flex-col",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="border-b border-[#1a1b23] p-4">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-sm font-semibold text-foreground">{getHeaderTitle()}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close right sidebar</span>
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
      
      {/* Footer */}
      <div className="border-t border-[#1a1b23] p-4">
        <div className="w-full">
          <p className="text-xs text-muted-foreground text-center">
            Galaxy Notes - {getHeaderTitle()}
          </p>
        </div>
      </div>
    </div>
  );
}
