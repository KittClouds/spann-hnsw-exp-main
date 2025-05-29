
import React from 'react';
import { MigrationControlPanel } from '@/components/migration/MigrationControlPanel';

export const Migration: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Entity Migration</h1>
        <p className="text-muted-foreground mt-2">
          Safely migrate existing entities to the new canonical format
        </p>
      </div>
      <MigrationControlPanel />
    </div>
  );
};
