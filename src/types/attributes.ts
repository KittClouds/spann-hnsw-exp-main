
export type AttributeType = 'Text' | 'Number' | 'Boolean' | 'Date' | 'List' | 'EntityLink' | 'URL';

export interface EntityReference {
  entityId: string;
  kind: string;
  label: string;
}

export type AttributeValue = string | number | boolean | Date | string[] | EntityReference;

export interface TypedAttribute {
  id: string;
  name: string;
  type: AttributeType;
  value: AttributeValue;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnhancedEntityAttributes {
  attributes: TypedAttribute[];
  metadata: {
    version: number;
    lastUpdated: string;
  };
}

export interface AttributeValidationError {
  field: string;
  message: string;
}
