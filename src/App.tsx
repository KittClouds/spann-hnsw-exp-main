
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GraphProvider } from "./contexts/GraphContext";

const App = () => {
  console.log("App component rendering");
  
  return (
    <TooltipProvider>
      <GraphProvider>
        <Toaster />
        <Sonner />
        <Outlet />
      </GraphProvider>
    </TooltipProvider>
  );
};

export default App;
