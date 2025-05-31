
import React from 'react';
import { Outlet } from 'react-router-dom';
import { GraphProvider } from '@/contexts/GraphContext';

function App() {
  return (
    <GraphProvider>
      <Outlet />
    </GraphProvider>
  );
}

export default App;
