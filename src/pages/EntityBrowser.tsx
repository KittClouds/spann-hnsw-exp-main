
import React, { useState, useEffect } from 'react';
import { useGraph } from '@/contexts/GraphContext';
import { EntityBrowser } from '@/components/entity-browser/EntityBrowser';
import { Toaster } from '@/components/ui/sonner';

export default function EntityBrowserPage() {
  return (
    <div className="container mx-auto p-4 flex flex-col min-h-screen">
      <Toaster />
      <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#9b87f5] to-[#7c5bf1]">
        Entity Browser
      </h1>
      <div className="flex-1">
        <EntityBrowser />
      </div>
    </div>
  );
}
