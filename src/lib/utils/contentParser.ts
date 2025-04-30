
import { Block } from "@blocknote/core";

// Regular expressions for detecting different types of connections
const WIKI_LINK_REGEX = /\[\[([^\[\]]+)\]\]/g;
const TAG_REGEX = /#([a-zA-Z0-9_-]+)/g;
const MENTION_REGEX = /@([a-zA-Z0-9_-]+)/g;

// Use generic types that match BlockNote's structure without requiring specific imports
interface StyledText {
  type: "text";
  text: string;
  styles?: Record<string, any>;
}

interface Link {
  type: "link";
  content: any[];
  href: string;
}

type InlineContent = StyledText | Link | any;

/**
 * Extracts all wiki links from a block's content
 */
export function extractWikiLinks(content: InlineContent[]): string[] {
  const links: string[] = [];
  extractFromContent(content, WIKI_LINK_REGEX, (match) => {
    links.push(match[1]);
  });
  return [...new Set(links)]; // Deduplicate
}

/**
 * Extracts all tags from a block's content
 */
export function extractTags(content: InlineContent[]): string[] {
  const tags: string[] = [];
  extractFromContent(content, TAG_REGEX, (match) => {
    tags.push(match[1]);
  });
  return [...new Set(tags)]; // Deduplicate
}

/**
 * Extracts all mentions from a block's content
 */
export function extractMentions(content: InlineContent[]): string[] {
  const mentions: string[] = [];
  extractFromContent(content, MENTION_REGEX, (match) => {
    mentions.push(match[1]);
  });
  return [...new Set(mentions)]; // Deduplicate
}

/**
 * Helper function to extract matches from content using a regex
 */
function extractFromContent(
  content: InlineContent[],
  regex: RegExp,
  callback: (match: RegExpExecArray) => void
) {
  if (!Array.isArray(content)) return;
  
  // Go through each content item
  content.forEach((item) => {
    if (item && item.type === "text" && typeof item.text === "string") {
      const textItem = item as StyledText;
      let match;
      // Reset regex state
      regex.lastIndex = 0;
      
      // Find all matches in the text
      while ((match = regex.exec(textItem.text)) !== null) {
        callback(match);
      }
    } else if (item && item.type === "link" && Array.isArray(item.content)) {
      // If it's a link with text content, recursively extract from it
      extractFromContent(item.content, regex, callback);
    }
  });
}

/**
 * Process an entire document (array of blocks) and extract all connections
 */
export function processDocument(blocks: Block[]): {
  links: string[];
  tags: string[];
  mentions: string[];
} {
  const links: string[] = [];
  const tags: string[] = [];
  const mentions: string[] = [];

  // Process each block in the document
  blocks.forEach((block) => {
    if (block.content && Array.isArray(block.content)) {
      // Extract connections from this block
      links.push(...extractWikiLinks(block.content));
      tags.push(...extractTags(block.content));
      mentions.push(...extractMentions(block.content));
    }

    // Process nested blocks if any
    if (block.children && block.children.length > 0) {
      const childConnections = processDocument(block.children);
      links.push(...childConnections.links);
      tags.push(...childConnections.tags);
      mentions.push(...childConnections.mentions);
    }
  });

  // Return deduplicated connections
  return {
    links: [...new Set(links)],
    tags: [...new Set(tags)],
    mentions: [...new Set(mentions)]
  };
}
