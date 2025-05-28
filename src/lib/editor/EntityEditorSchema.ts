
import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core';
import { 
  TagInlineSpec, 
  MentionInlineSpec, 
  WikiLinkInlineSpec, 
  EntityInlineSpec, 
  TripleInlineSpec 
} from '@/components/editor/inline/EntityInlineSpecs';

// Create extended schema with custom inline content types
export const entityEditorSchema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    tag: TagInlineSpec,
    mention: MentionInlineSpec,
    wikilink: WikiLinkInlineSpec,
    entity: EntityInlineSpec,
    triple: TripleInlineSpec
  }
});

export type EntityEditorSchema = typeof entityEditorSchema;
