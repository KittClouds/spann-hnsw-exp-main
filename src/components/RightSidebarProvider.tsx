
import React, { createContext, useContext, useEffect } from 'react';
import { useAtom } from 'jotai';
import { rightSidebarOpenAtom, rightSidebarMobileAtom } from '@/lib/rightSidebarStore';
import { cn } from '@/lib/utils';

interface RightSidebarContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
}

const RightSidebarContext = createContext<RightSidebarContextType | null>(null);

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  if (!context) {
    throw new Error('useRightSidebar must be used within a RightSidebarProvider');
  }
  return context;
}

interface RightSidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function RightSidebarProvider({ 
  children, 
  defaultOpen = false 
}: RightSidebarProviderProps) {
  const [open, setOpen] = useAtom(rightSidebarOpenAtom);
  const [openMobile, setOpenMobile] = useAtom(rightSidebarMobileAtom);
  const [isMobile, setIsMobile] = React.useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize with defaultOpen if not set
  useEffect(() => {
    if (open === undefined && defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen, open, setOpen]);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(!openMobile);
    } else {
      setOpen(!open);
    }
  }, [isMobile, open, openMobile, setOpen, setOpenMobile]);

  const contextValue = React.useMemo(() => ({
    open: isMobile ? openMobile : open,
    setOpen: isMobile ? setOpenMobile : setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar,
  }), [isMobile, open, openMobile, setOpen, setOpenMobile, toggleSidebar]);

  return (
    <RightSidebarContext.Provider value={contextValue}>
      <div 
        className={cn(
          "relative w-full h-full",
          // Mobile overlay
          isMobile && openMobile && "overflow-hidden"
        )}
      >
        {children}
      </div>
    </RightSidebarContext.Provider>
  );
}
