
import { EntityBlueprint } from '@/types/blueprints';
import { createDefaultBlueprints } from './defaultBlueprints';

const ENTITY_KIND_TO_BLUEPRINT_MAP: Record<string, string> = {
  'CHARACTER': 'character-blueprint',
  'FACTION': 'faction-blueprint',
  'SCENE': 'scene-blueprint',
  'LOCATION': 'location-blueprint',
  'ITEM': 'item-blueprint',
  'EVENT': 'event-blueprint'
};

export function getBlueprintForEntityKind(kind: string): EntityBlueprint | null {
  const blueprints = createDefaultBlueprints();
  const blueprintId = ENTITY_KIND_TO_BLUEPRINT_MAP[kind];
  
  if (!blueprintId) return null;
  
  return blueprints.find(blueprint => 
    blueprint.entityKind === kind
  ) || null;
}

export function getAllAvailableBlueprints(): EntityBlueprint[] {
  return createDefaultBlueprints();
}

export function getEntityKinds(): string[] {
  return Object.keys(ENTITY_KIND_TO_BLUEPRINT_MAP);
}
