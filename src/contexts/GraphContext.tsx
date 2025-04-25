
import React, { createContext, useContext, useEffect, useState } from 'react';
import { GraphAPI } from '../services/GraphAPI';
import { graphService } from '../services/GraphService';
import { ElementDefinition } from 'cytoscape';

interface GraphContextType extends GraphAPI {
  // Add any additional context-specific properties here
  isLoading: boolean;
  lastUpdate: number; // Timestamp of last graph update
}

const GraphContext = createContext<GraphContextType | null>(null);

export const GraphProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Handle initial loading state
  useEffect(() => {
    // Simulate loading or actual initialization logic
    setIsLoading(false);
    
    // Add a change listener to track updates
    const handleGraphChange = () => {
      setLastUpdate(Date.now());
    };
    
    graphService.addChangeListener(handleGraphChange);
    
    return () => {
      graphService.removeChangeListener(handleGraphChange);
    };
  }, []);
  
  // Create context value - extend graphService with context-specific properties
  const contextValue: GraphContextType = {
    ...graphService as unknown as GraphAPI, // Cast to GraphAPI to ensure interface compliance
    isLoading,
    lastUpdate
  };
  
  return (
    <GraphContext.Provider value={contextValue}>
      {children}
    </GraphContext.Provider>
  );
};

export const useGraph = (): GraphContextType => {
  const context = useContext(GraphContext);
  if (context === null) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};
