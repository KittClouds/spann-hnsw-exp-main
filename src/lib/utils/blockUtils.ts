
import { 
  Block, 
  PartialInlineContent, 
  defaultInlineContentSpecs, 
  defaultStyleSpecs,
  StyledText
} from "@blocknote/core";

/**
 * Type alias for PartialInlineContent with default BlockNote specs
 */
export type DefaultPartialInlineContent = PartialInlineContent<
  typeof defaultInlineContentSpecs,
  typeof defaultStyleSpecs
>;

/**
 * Creates a text object for BlockNote content
 */
export const createStyledText = (text: string): StyledText => ({
  type: "text",
  text,
  styles: {},
});

/**
 * Creates a properly structured paragraph block
 */
export const createParagraphBlock = (text: string, id?: string): Block => ({
  id: id || `block-${Math.random().toString(36).substring(2, 9)}`,
  type: "paragraph",
  props: {
    backgroundColor: "default",
    textColor: "default",
    textAlignment: "left"
  },
  content: [createStyledText(text)],
  children: [],
});

/**
 * Creates an empty paragraph block
 */
export const createEmptyBlock = (id?: string): Block => createParagraphBlock("", id);

/**
 * Helper to convert simple content strings to proper Block content structure
 */
export const convertSimpleBlockToProperBlock = (block: any): Block => {
  // If it's already a proper block, just return it
  if (typeof block.content !== 'string' && Array.isArray(block.content)) {
    return block as Block;
  }

  return {
    id: block.id || `block-${Math.random().toString(36).substring(2, 9)}`,
    type: block.type || "paragraph",
    props: block.type === "paragraph" ? {
      backgroundColor: "default",
      textColor: "default",
      textAlignment: "left"
    } : block.props || {},
    content: typeof block.content === 'string' 
      ? [createStyledText(block.content)] 
      : [],
    children: block.children || [],
  };
};
