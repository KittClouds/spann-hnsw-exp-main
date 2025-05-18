
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';

export function EntityBrowserLink() {
  const location = useLocation();
  const isActive = location.pathname === '/entities';
  
  return (
    <Link to="/entities">
      <Button 
        variant={isActive ? "secondary" : "ghost"} 
        className="w-full justify-start"
      >
        <Database className="mr-2 h-4 w-4" />
        Entity Browser
      </Button>
    </Link>
  );
}
