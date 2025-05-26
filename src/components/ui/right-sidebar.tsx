
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useRightSidebar } from "@/components/RightSidebarProvider";

const rightSidebarVariants = cva(
  "group/right-sidebar relative flex h-full w-[--right-sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
  {
    variants: {
      variant: {
        sidebar: "border-l border-sidebar-border",
        floating: "border border-sidebar-border shadow-lg rounded-lg",
        inset: "border-l border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60",
      },
      side: {
        right: "",
      },
      collapsible: {
        offcanvas: "",
        icon: "",
        none: "",
      },
    },
    defaultVariants: {
      variant: "sidebar",
      side: "right",
      collapsible: "offcanvas",
    },
  }
);

interface RightSidebarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof rightSidebarVariants> {}

const RightSidebar = React.forwardRef<HTMLDivElement, RightSidebarProps>(
  ({ className, variant, side, collapsible, ...props }, ref) => {
    const { open, isMobile } = useRightSidebar();

    return (
      <div
        ref={ref}
        className={cn(
          rightSidebarVariants({ variant, side, collapsible }),
          "fixed right-0 top-0 z-40 transition-transform duration-200 ease-in-out",
          !open && "translate-x-full",
          isMobile && "w-[280px]",
          className
        )}
        style={{
          "--right-sidebar-width": isMobile ? "280px" : "256px",
        } as React.CSSProperties}
        {...props}
      />
    );
  }
);
RightSidebar.displayName = "RightSidebar";

const RightSidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-1 flex-col gap-2 overflow-auto p-2", className)}
    {...props}
  />
));
RightSidebarContent.displayName = "RightSidebarContent";

const RightSidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-12 shrink-0 items-center border-b p-2", className)}
    {...props}
  />
));
RightSidebarHeader.displayName = "RightSidebarHeader";

const RightSidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex shrink-0 items-center border-t p-2", className)}
    {...props}
  />
));
RightSidebarFooter.displayName = "RightSidebarFooter";

const RightSidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useRightSidebar();

  return (
    <button
      ref={ref}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
RightSidebarTrigger.displayName = "RightSidebarTrigger";

export {
  RightSidebar,
  RightSidebarContent,
  RightSidebarHeader,
  RightSidebarFooter,
  RightSidebarTrigger,
};
