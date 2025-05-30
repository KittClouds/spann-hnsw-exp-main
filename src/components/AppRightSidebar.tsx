
import React from "react";
import { X } from "lucide-react";
import { useAtom } from "jotai";
import { rightSidebarContentAtom } from "@/lib/rightSidebarStore";
import { selectedEntityAtom } from "@/hooks/useEntitySelection";
import { useRightSidebar } from "@/components/RightSidebarProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EntityAttributePanel } from "@/components/entity-attributes/EntityAttributePanel";
import { UniversalEntityDetailPanel } from "@/components/entity-detail/UniversalEntityDetailPanel";

export function AppRightSidebar() {
  const [contentType] = useAtom(rightSidebarContentAtom);
  const [selectedEntity] = useAtom(selectedEntityAtom);
  const { open, toggleSidebar } = useRightSidebar();

  const renderContent = () => {
    switch (contentType) {
      case 'entity-detail':
        return selectedEntity ? (
          <UniversalEntityDetailPanel 
            entity={selectedEntity}
            onEntityUpdated={() => {
              // Entity updates will be reflected via reactive queries
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No entity selected</p>
            </div>
          </div>
        );
      case 'entity-attributes':
        return <EntityAttributePanel />;
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
          <h2 className="text-sm font-semibold text-foreground">
            {contentType === 'entity-detail' ? 'Entity Details' : 'Right Panel'}
          </h2>
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
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
      
      {/* Footer */}
      <div className="border-t border-[#1a1b23] p-4">
        <div className="w-full">
          <p className="text-xs text-muted-foreground text-center">
            Galaxy Notes - Right Panel
          </p>
        </div>
      </div>
    </div>
  );
}
