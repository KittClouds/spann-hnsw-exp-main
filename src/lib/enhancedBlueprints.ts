import { EntityBlueprint } from '@/types/blueprints';
import { generateNodeId } from './utils/ids';

export const createEnhancedBlueprints = (): EntityBlueprint[] => {
  const now = new Date().toISOString();

  return [
    {
      id: generateNodeId(),
      entityKind: 'CHARACTER',
      name: 'Enhanced Character Blueprint',
      description: 'Complete character sheet with stats, resources, and attributes',
      templates: [
        // Basic Info
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
        // Physical Stats
        {
          id: generateNodeId(),
          name: 'Physical Stats',
          type: 'Text', // Will be converted to StatBlock
          defaultValue: JSON.stringify({
            category: 'Physical',
            stats: { strength: 10, dexterity: 10, constitution: 10, agility: 10, resilience: 10 }
          }),
          required: false,
          description: 'Physical capabilities and attributes'
        },
        // Mental Stats
        {
          id: generateNodeId(),
          name: 'Mental Stats',
          type: 'Text', // Will be converted to StatBlock
          defaultValue: JSON.stringify({
            category: 'Mental',
            stats: { intelligence: 10, wisdom: 10, willpower: 10, perception: 10, charisma: 10 }
          }),
          required: false,
          description: 'Mental capabilities and social attributes'
        },
        // Resources
        {
          id: generateNodeId(),
          name: 'Health',
          type: 'Text', // Will be converted to Resource
          defaultValue: JSON.stringify({ current: 100, max: 100, color: 'bg-red-500' }),
          required: false,
          description: 'Character health points'
        },
        {
          id: generateNodeId(),
          name: 'Stamina',
          type: 'Text', // Will be converted to Resource
          defaultValue: JSON.stringify({ current: 100, max: 100, color: 'bg-yellow-500' }),
          required: false,
          description: 'Physical endurance'
        },
        {
          id: generateNodeId(),
          name: 'Mana',
          type: 'Text', // Will be converted to Resource
          defaultValue: JSON.stringify({ current: 50, max: 50, color: 'bg-blue-500' }),
          required: false,
          description: 'Magical energy'
        },
        // Other Attributes
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
      entityKind: 'FACTION',
      name: 'Faction Blueprint',
      description: 'Organization or group with influence and resources',
      templates: [
        {
          id: generateNodeId(),
          name: 'Type',
          type: 'Text',
          defaultValue: 'Political',
          required: false,
          description: 'Type of faction (political, military, religious, etc.)'
        },
        {
          id: generateNodeId(),
          name: 'Influence',
          type: 'Text', // Will be converted to Resource
          defaultValue: JSON.stringify({ current: 50, max: 100, color: 'bg-purple-500', unit: 'points' }),
          required: false,
          description: 'Political or social influence'
        },
        {
          id: generateNodeId(),
          name: 'Resources',
          type: 'Text', // Will be converted to Resource
          defaultValue: JSON.stringify({ current: 1000, max: 5000, color: 'bg-green-500', unit: 'gold' }),
          required: false,
          description: 'Economic resources'
        },
        {
          id: generateNodeId(),
          name: 'Territory',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Controlled territories and regions'
        },
        {
          id: generateNodeId(),
          name: 'Alignment',
          type: 'Text',
          defaultValue: 'Neutral',
          required: false,
          description: 'Moral alignment or philosophy'
        }
      ],
      isDefault: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateNodeId(),
      entityKind: 'LOCATION',
      name: 'Enhanced Location Blueprint',
      description: 'Detailed location with importance and accessibility ratings',
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
          name: 'Importance',
          type: 'Text', // Will be converted to Resource
          defaultValue: JSON.stringify({ current: 5, max: 10, color: 'bg-orange-500', unit: 'level' }),
          required: false,
          description: 'Strategic or narrative importance'
        },
        {
          id: generateNodeId(),
          name: 'Accessibility',
          type: 'Text', // Will be converted to Resource
          defaultValue: JSON.stringify({ current: 7, max: 10, color: 'bg-cyan-500', unit: 'level' }),
          required: false,
          description: 'How easy it is to reach this location'
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
          name: 'Notable Features',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Important landmarks or characteristics'
        }
      ],
      isDefault: true,
      createdAt: now,
      updatedAt: now
    }
  ];
};
