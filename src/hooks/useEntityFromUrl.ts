
import { useState, useEffect } from 'react';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { entityUrlHelpers, entityActions } from '@/lib/entityActions';
import { useStore } from '@livestore/react';
import { entitiesQuery } from '@/livestore/queries/entities';

export function useEntityFromUrl() {
  const { store } = useStore();
  const [urlEntity, setUrlEntity] = useState<EntityWithReferences | null>(null);
  
  useEffect(() => {
    const entityFromUrl = entityUrlHelpers.getEntityFromUrl();
    if (entityFromUrl) {
      // Find the entity in our data
      const entities = store.query(entitiesQuery);
      const foundEntity = entities.find(e => 
        e.label === entityFromUrl.label && e.kind === entityFromUrl.kind
      );
      
      if (foundEntity) {
        setUrlEntity(foundEntity);
        entityActions.setSelectedEntity(foundEntity);
      }
    }
  }, [store]);
  
  return urlEntity;
}
