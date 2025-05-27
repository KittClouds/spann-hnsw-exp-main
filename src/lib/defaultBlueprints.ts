
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
          name: 'Name',
          type: 'Text',
          defaultValue: '',
          required: true,
          description: 'Character name'
        },
        {
          id: generateNodeId(),
          name: 'Portrait',
          type: 'URL',
          defaultValue: '',
          required: false,
          description: 'Character portrait URL'
        },
        {
          id: generateNodeId(),
          name: 'Race',
          type: 'Text',
          defaultValue: 'Human',
          required: false,
          description: 'Character race or species'
        },
        {
          id: generateNodeId(),
          name: 'Class',
          type: 'Text',
          defaultValue: '',
          required: false,
          description: 'Character class or profession'
        },
        {
          id: generateNodeId(),
          name: 'Level',
          type: 'Number',
          defaultValue: 1,
          required: false,
          description: 'Character level'
        },
        {
          id: generateNodeId(),
          name: 'Health',
          type: 'ProgressBar',
          defaultValue: { current: 100, maximum: 100 },
          required: false,
          description: 'Current and maximum health'
        },
        {
          id: generateNodeId(),
          name: 'Mana',
          type: 'ProgressBar',
          defaultValue: { current: 50, maximum: 50 },
          required: false,
          description: 'Current and maximum mana'
        },
        {
          id: generateNodeId(),
          name: 'Stats',
          type: 'StatBlock',
          defaultValue: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
          required: false,
          description: 'Character ability scores'
        },
        {
          id: generateNodeId(),
          name: 'Alignment',
          type: 'Text',
          defaultValue: 'Neutral',
          required: false,
          description: 'Character alignment'
        },
        {
          id: generateNodeId(),
          name: 'Background',
          type: 'Text',
          defaultValue: '',
          required: false,
          description: 'Character background story'
        },
        {
          id: generateNodeId(),
          name: 'Relationships',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Character relationships and connections'
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
      description: 'Standard attributes for faction entities',
      templates: [
        {
          id: generateNodeId(),
          name: 'Name',
          type: 'Text',
          defaultValue: '',
          required: true,
          description: 'Faction name'
        },
        {
          id: generateNodeId(),
          name: 'Faction Type',
          type: 'Text',
          defaultValue: 'Guild',
          required: false,
          description: 'Type of faction'
        },
        {
          id: generateNodeId(),
          name: 'Goal',
          type: 'Text',
          defaultValue: '',
          required: false,
          description: 'Primary faction goal or purpose'
        },
        {
          id: generateNodeId(),
          name: 'Size',
          type: 'Number',
          defaultValue: 10,
          required: false,
          description: 'Number of faction members'
        },
        {
          id: generateNodeId(),
          name: 'Power Level',
          type: 'Number',
          defaultValue: 1,
          required: false,
          description: 'Faction influence level (1-10)'
        },
        {
          id: generateNodeId(),
          name: 'Allies',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Allied factions and entities'
        },
        {
          id: generateNodeId(),
          name: 'Enemies',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Enemy factions and entities'
        }
      ],
      isDefault: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateNodeId(),
      entityKind: 'SCENE',
      name: 'Scene Blueprint',
      description: 'Standard attributes for scene entities',
      templates: [
        {
          id: generateNodeId(),
          name: 'Scene Type',
          type: 'Text',
          defaultValue: 'Dialogue',
          required: false,
          description: 'Type of scene'
        },
        {
          id: generateNodeId(),
          name: 'Mood',
          type: 'Text',
          defaultValue: 'Neutral',
          required: false,
          description: 'Overall mood of the scene'
        },
        {
          id: generateNodeId(),
          name: 'Time of Day',
          type: 'Text',
          defaultValue: 'Day',
          required: false,
          description: 'When the scene takes place'
        },
        {
          id: generateNodeId(),
          name: 'Location',
          type: 'EntityLink',
          defaultValue: { entityId: '', kind: 'LOCATION', label: '' },
          required: false,
          description: 'Scene location'
        },
        {
          id: generateNodeId(),
          name: 'Participants',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Characters involved in the scene'
        },
        {
          id: generateNodeId(),
          name: 'Outcome',
          type: 'Text',
          defaultValue: '',
          required: false,
          description: 'Summary of scene outcome'
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
          name: 'Name',
          type: 'Text',
          defaultValue: '',
          required: true,
          description: 'Location name'
        },
        {
          id: generateNodeId(),
          name: 'Location Type',
          type: 'Text',
          defaultValue: 'City',
          required: false,
          description: 'Type of location'
        },
        {
          id: generateNodeId(),
          name: 'Population',
          type: 'Number',
          defaultValue: 1000,
          required: false,
          description: 'Number of inhabitants'
        },
        {
          id: generateNodeId(),
          name: 'Climate',
          type: 'Text',
          defaultValue: 'Temperate',
          required: false,
          description: 'Climate conditions'
        },
        {
          id: generateNodeId(),
          name: 'Controlling Faction',
          type: 'EntityLink',
          defaultValue: { entityId: '', kind: 'FACTION', label: '' },
          required: false,
          description: 'Faction that controls this location'
        },
        {
          id: generateNodeId(),
          name: 'Description',
          type: 'Text',
          defaultValue: '',
          required: false,
          description: 'Detailed location description'
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
          name: 'Name',
          type: 'Text',
          defaultValue: '',
          required: true,
          description: 'Item name'
        },
        {
          id: generateNodeId(),
          name: 'Item Type',
          type: 'Text',
          defaultValue: 'Misc',
          required: false,
          description: 'Category of item'
        },
        {
          id: generateNodeId(),
          name: 'Rarity',
          type: 'Text',
          defaultValue: 'Common',
          required: false,
          description: 'Item rarity level'
        },
        {
          id: generateNodeId(),
          name: 'Weight',
          type: 'Number',
          defaultValue: 1,
          unit: 'lbs',
          required: false,
          description: 'Item weight'
        },
        {
          id: generateNodeId(),
          name: 'Value',
          type: 'Number',
          defaultValue: 10,
          unit: 'gold',
          required: false,
          description: 'Item monetary value'
        },
        {
          id: generateNodeId(),
          name: 'Owner',
          type: 'EntityLink',
          defaultValue: { entityId: '', kind: 'CHARACTER', label: '' },
          required: false,
          description: 'Current item owner'
        },
        {
          id: generateNodeId(),
          name: 'Effects',
          type: 'Text',
          defaultValue: '',
          required: false,
          description: 'Item effects and abilities'
        }
      ],
      isDefault: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateNodeId(),
      entityKind: 'EVENT',
      name: 'Event Blueprint',
      description: 'Standard attributes for event entities',
      templates: [
        {
          id: generateNodeId(),
          name: 'Name',
          type: 'Text',
          defaultValue: '',
          required: true,
          description: 'Event name'
        },
        {
          id: generateNodeId(),
          name: 'Event Type',
          type: 'Text',
          defaultValue: 'Social',
          required: false,
          description: 'Category of event'
        },
        {
          id: generateNodeId(),
          name: 'Date',
          type: 'Date',
          defaultValue: new Date().toISOString(),
          required: false,
          description: 'When the event occurred'
        },
        {
          id: generateNodeId(),
          name: 'Location',
          type: 'EntityLink',
          defaultValue: { entityId: '', kind: 'LOCATION', label: '' },
          required: false,
          description: 'Event location'
        },
        {
          id: generateNodeId(),
          name: 'Participants',
          type: 'List',
          defaultValue: [],
          required: false,
          description: 'Entities involved in the event'
        },
        {
          id: generateNodeId(),
          name: 'Consequence',
          type: 'Text',
          defaultValue: '',
          required: false,
          description: 'Event consequences and outcomes'
        }
      ],
      isDefault: true,
      createdAt: now,
      updatedAt: now
    }
  ];
};
