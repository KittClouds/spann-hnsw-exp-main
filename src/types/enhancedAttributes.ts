
import { AttributeType, AttributeValue, TypedAttribute } from './attributes';

export type EnhancedAttributeType = AttributeType | 'Resource' | 'StatBlock' | 'Affiliation' | 'StatusEffect';

export interface ResourceAttribute {
  current: number;
  max: number;
  color?: string;
  unit?: string;
}

export interface StatBlockAttribute {
  category: string;
  stats: Record<string, number>;
}

export interface AffiliationAttribute {
  entityKind: string;
  entityLabel: string;
  relationshipType: string;
  strength: number; // 1-10 scale
}

export interface StatusEffectAttribute {
  name: string;
  description: string;
  duration?: number;
  modifier: number;
  type: 'buff' | 'debuff' | 'neutral';
}

export type EnhancedAttributeValue = 
  | AttributeValue 
  | ResourceAttribute 
  | StatBlockAttribute 
  | AffiliationAttribute 
  | StatusEffectAttribute;

export interface EnhancedTypedAttribute extends Omit<TypedAttribute, 'type' | 'value'> {
  type: EnhancedAttributeType;
  value: EnhancedAttributeValue;
}
