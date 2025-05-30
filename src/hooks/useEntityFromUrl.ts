
import { useState, useEffect } from 'react';
import { EntityWithReferences } from '@/livestore/queries/entities';
import { entityUrlHelpers, entityActions } from '@/lib/entityActions';
import { useStore } from '@livestore/react';
import { allEntitiesArray$ } from '@/livestore/queries/entities';

export function useEntityFromUrl() {
  const { store } = useStore();
  const [urlEntity, setUrlEntity] = useState<EntityWithReferences | null>(null);
  
  useEffect(() => {
    const entityFromUrl = entityUrlHelpers.getEntityFromUrl();
    if (entityFromUrl) {
      // Find the entity in our data
      const entities = store.query(allEntitiesArray$);
      const foundEntity = Array.isArray(entities) ? entities.find(e => 
        e.label === entityFromUrl.label && e.kind === entityFromUrl.kind
      ) : undefined;
      
      if (foundEntity) {
        setUrlEntity(foundEntity);
        entityActions.setSelectedEntity(foundEntity);
      }
    }
  }, [store]);
  
  return urlEntity;
}
