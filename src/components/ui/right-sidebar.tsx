
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

    if (collapsible === "none") {
      return (
        <div
          className={cn(
            rightSidebarVariants({ variant, side, collapsible }),
            className
          )}
          ref={ref}
          {...props}
        />
      );
    }

    if (isMobile) {
      return (
        <div
          ref={ref}
          className={cn(
            rightSidebarVariants({ variant, side, collapsible }),
            "fixed right-0 top-0 z-40 transition-transform duration-200 ease-in-out",
            !open && "translate-x-full",
            "w-[280px]",
            className
          )}
          style={{
            "--right-sidebar-width": "280px",
          } as React.CSSProperties}
          {...props}
        />
      );
    }

    return (
      <div
        ref={ref}
        className="group peer-right hidden md:block text-sidebar-foreground"
        data-state={open ? "expanded" : "collapsed"}
        data-collapsible={open ? "" : collapsible}
        data-variant={variant}
        data-side={side}
      >
        {/* This handles the sidebar gap on desktop */}
        <div
          className={cn(
            "duration-200 relative h-svh w-[--right-sidebar-width] bg-transparent transition-[width] ease-linear",
            "group-data-[collapsible=offcanvas]:w-0",
            variant === "floating" || variant === "inset"
              ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
              : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]"
          )}
        />
        <div
          className={cn(
            "duration-200 fixed inset-y-0 z-10 hidden h-svh w-[--right-sidebar-width] transition-[right,width] ease-linear md:flex",
            "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--right-sidebar-width)*-1)]",
            variant === "floating" || variant === "inset"
              ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
              : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] border-l",
            className
          )}
          style={{
            "--right-sidebar-width": "256px",
          } as React.CSSProperties}
          {...props}
        >
          <div
            data-sidebar="right-sidebar"
            className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
          >
            {props.children}
          </div>
        </div>
      </div>
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
