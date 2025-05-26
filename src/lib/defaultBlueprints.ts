
import { EntityBlueprint } from '@/types/blueprints';
import { generateNodeId } from './utils/ids';

export const createDefaultBlueprints = (): EntityBlueprint[] => {
  const now = new Date().toISOString();

  return [
    {
      id: generateNodeId(),
      entityKind: 'CHARACTER',
      name: 'Character Blueprint',
      description: 'Standard attributes for character entities',
      templates: [
        {
          id: generateNodeId(),
          name: 'Age',
          type: 'Number',
          defaultValue: 25,
          unit: 'years',
          required: false,
          description: 'Character age in years'
        },
        {
          id: generateNodeId(),
          name: 'Species',
          type: 'Text',
          defaultValue: 'Human',
          required: true,
          description: 'Character species or race'
        },
        {
          id: generateNodeId(),
          name: 'Occupation',
          type: 'Text',
          defaultValue: '',
          required: false,
          description: 'Character job or role'
        },
        {
          id: generateNodeId(),
          name: 'Skills',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Character abilities and skills'
        },
        {
          id: generateNodeId(),
          name: 'Is Alive',
          type: 'Boolean',
          defaultValue: true,
          required: false,
          description: 'Whether the character is currently alive'
        }
      ],
      isDefault: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateNodeId(),
      entityKind: 'LOCATION',
      name: 'Location Blueprint',
      description: 'Standard attributes for location entities',
      templates: [
        {
          id: generateNodeId(),
          name: 'Type',
          type: 'Text',
          defaultValue: 'City',
          required: false,
          description: 'Type of location (city, building, etc.)'
        },
        {
          id: generateNodeId(),
          name: 'Population',
          type: 'Number',
          defaultValue: 0,
          unit: 'people',
          required: false,
          description: 'Number of inhabitants'
        },
        {
          id: generateNodeId(),
          name: 'Climate',
          type: 'Text',
          defaultValue: 'Temperate',
          required: false,
          description: 'Climate or weather conditions'
        },
        {
          id: generateNodeId(),
          name: 'Notable Features',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Important landmarks or characteristics'
        },
        {
          id: generateNodeId(),
          name: 'Established',
          type: 'Date',
          defaultValue: new Date().toISOString(),
          required: false,
          description: 'Date when location was established'
        }
      ],
      isDefault: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateNodeId(),
      entityKind: 'ITEM',
      name: 'Item Blueprint',
      description: 'Standard attributes for item entities',
      templates: [
        {
          id: generateNodeId(),
          name: 'Rarity',
          type: 'Text',
          defaultValue: 'Common',
          required: false,
          description: 'How rare or valuable the item is'
        },
        {
          id: generateNodeId(),
          name: 'Weight',
          type: 'Number',
          defaultValue: 1,
          unit: 'kg',
          required: false,
          description: 'Physical weight of the item'
        },
        {
          id: generateNodeId(),
          name: 'Value',
          type: 'Number',
          defaultValue: 0,
          unit: 'coins',
          required: false,
          description: 'Monetary value'
        },
        {
          id: generateNodeId(),
          name: 'Is Magical',
          type: 'Boolean',
          defaultValue: false,
          required: false,
          description: 'Whether the item has magical properties'
        },
        {
          id: generateNodeId(),
          name: 'Effects',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Special effects or abilities'
        }
      ],
      isDefault: true,
      createdAt: now,
      updatedAt: now
    }
  ];
};
