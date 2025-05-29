
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GraphProvider } from "./contexts/GraphContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GraphProvider>
        <Toaster />
        <Sonner />
        <Outlet />
      </GraphProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
