
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { UniversalEntityDetailPanel } from '@/components/entity-detail/UniversalEntityDetailPanel';
import { urlToEntity } from '@/lib/entityUrlUtils';

export default function EntityDetail() {
  const { type, label } = useParams<{ type: string; label: string }>();

  if (!type || !label) {
    return <Navigate to="/" replace />;
  }

  const entity = urlToEntity(type, label);

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="bg-card rounded-lg border shadow-sm">
        <UniversalEntityDetailPanel entity={entity} />
      </div>
    </div>
  );
}
