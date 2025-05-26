
import { AttributeType, AttributeValue } from './attributes';

export interface AttributeTemplate {
  id: string;
  name: string;
  type: AttributeType;
  defaultValue?: AttributeValue;
  unit?: string;
  required?: boolean;
  description?: string;
}

export interface EntityBlueprint {
  id: string;
  entityKind: string;
  name: string;
  description?: string;
  templates: AttributeTemplate[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlueprintStorage {
  blueprints: EntityBlueprint[];
  version: number;
  lastUpdated: string;
}
