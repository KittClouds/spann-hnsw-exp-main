
import { Block, InlineContent } from '@blocknote/core';
import { Note } from '../store'; // Use Note instead of NoteId

// Regex for tags (#alphanumeric), mentions (@alphanumeric), and links ([[any character except ]]])
const TAG_REGEX = /#([a-zA-Z0-9_]+)/g;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;
// Updated regex to handle potential spaces but capture the core title
const LINK_REGEX = /\[\[\s*([^\]\s|][^\]|]*?)\s*(?:\|[^\]]*)?\]\]/g; // Capture from `[[Title]]` or `[[Title|Alias]]`

export interface ParsedConnections {
  tags: string[];
  mentions: string[];
  links: string[]; // Stores link titles
}

// Helper to extract text from InlineContent[]
function extractTextFromInlineContent(content: InlineContent<any>[]): string {
  return content.map(item => {
    if (item.type === 'text') {
      return item.text;
    } else if (item.type === 'link') {
      // Also extract text from within links if needed, though the [[Link]] regex handles top-level links
       return extractTextFromInlineContent(item.content);
    }
    // Add other inline types if necessary
    return '';
  }).join('');
}

// Helper to extract text from a Block and its children recursively
function extractTextFromBlock(block: Block): string {
    let blockText = '';
    if (block.content) {
        if (Array.isArray(block.content)) {
            blockText += extractTextFromInlineContent(block.content);
        }
    }
    // Recursively process children blocks (like list items)
    if (block.children && block.children.length > 0) {
        for (const child of block.children) {
            blockText += '\n' + extractTextFromBlock(child);
        }
    }
    return blockText;
}


export function parseNoteConnections(blocks: Block[] | undefined): ParsedConnections {
  const connections: ParsedConnections = { tags: [], mentions: [], links: [] };
  if (!blocks) return connections;

  let fullText = '';
  for (const block of blocks) {
    fullText += extractTextFromBlock(block) + '\n';
  }

  let match;
  const uniqueTags = new Set<string>();
  const uniqueMentions = new Set<string>();
  const uniqueLinks = new Set<string>();

  // Extract tags
  while ((match = TAG_REGEX.exec(fullText)) !== null) {
    uniqueTags.add(match[1]);
  }

  // Extract mentions
  while ((match = MENTION_REGEX.exec(fullText)) !== null) {
     uniqueMentions.add(match[1]);
  }

  // Extract links
  while ((match = LINK_REGEX.exec(fullText)) !== null) {
    const linkTitle = match[1].trim(); // Capture group 1 is the title
    if (linkTitle) {
        uniqueLinks.add(linkTitle);
    }
  }

  connections.tags = Array.from(uniqueTags);
  connections.mentions = Array.from(uniqueMentions);
  connections.links = Array.from(uniqueLinks);

  return connections;
}

// Function to parse all notes and return maps
export function parseAllNotes(notes: Note[]): {
  tagsMap: Map<string, string[]>;
  mentionsMap: Map<string, string[]>;
  linksMap: Map<string, string[]>; // Map note ID to link *titles*
} {
  const tagsMap = new Map<string, string[]>();
  const mentionsMap = new Map<string, string[]>();
  const linksMap = new Map<string, string[]>();

  notes.forEach(note => {
    // Only parse actual notes; folders/other types get empty arrays
    if (note.type === 'note') {
        const { tags, mentions, links } = parseNoteConnections(note.content);
        tagsMap.set(note.id, tags);
        mentionsMap.set(note.id, mentions);
        linksMap.set(note.id, links);
    } else {
        tagsMap.set(note.id, []);
        mentionsMap.set(note.id, []);
        linksMap.set(note.id, []);
    }
  });

  return { tagsMap, mentionsMap, linksMap };
}
