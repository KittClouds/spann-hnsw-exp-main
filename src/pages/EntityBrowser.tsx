
import React from 'react';
import { EntityBrowser } from '@/components/entity-browser/EntityBrowser';
import { EntityDetailModal } from '@/components/entity-detail/EntityDetailModal';
import { useEntityActions } from '@/hooks/useEntityActions';
import { useEntityFromUrl } from '@/hooks/useEntityFromUrl';
import { Toaster } from '@/components/ui/sonner';

export default function EntityBrowserPage() {
  const { selectedEntity, modalOpen, closeModal } = useEntityActions();
  
  // Load entity from URL if present
  useEntityFromUrl();

  return (
    <div className="container mx-auto p-4 flex flex-col min-h-screen">
      <Toaster />
      <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#9b87f5] to-[#7c5bf1]">
        Entity Browser
      </h1>
      <div className="flex-1">
        <EntityBrowser />
      </div>
      
      <EntityDetailModal
        entity={selectedEntity}
        open={modalOpen}
        onClose={closeModal}
        onEntityUpdated={() => {
          // Entity updates will be reflected via reactive queries
        }}
      />
    </div>
  );
}
