
import React from "react";
import { X } from "lucide-react";
import { useAtom } from "jotai";
import { rightSidebarContentAtom } from "@/lib/rightSidebarStore";
import { useRightSidebar } from "@/components/RightSidebarProvider";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppRightSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [contentType] = useAtom(rightSidebarContentAtom);
  const { toggleSidebar } = useRightSidebar();

  const renderContent = () => {
    switch (contentType) {
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
    <Sidebar 
      side="right" 
      className="bg-black border-l border-[#1a1b23]" 
      {...props}
    >
      <SidebarHeader className="border-b border-[#1a1b23]">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-sm font-semibold text-foreground">Right Panel</h2>
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
      </SidebarHeader>
      
      <SidebarContent>
        {renderContent()}
      </SidebarContent>
      
      <SidebarFooter className="border-t border-[#1a1b23]">
        <div className="w-full">
          <p className="text-xs text-muted-foreground text-center">
            Galaxy Notes - Right Panel
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
