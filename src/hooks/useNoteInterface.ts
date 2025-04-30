
import { BlockNoteEditor, Block, PartialBlock } from '@blocknote/core';
import { createStyledText } from '@/lib/utils/blockUtils';

export interface NoteInterface {
  // Document & Block Operations
  getDocument: () => Block[];
  insertBlocks: (blocks: PartialBlock[], referenceBlockId: string, placement?: 'before' | 'after') => void;
  updateBlock: (blockId: string, update: PartialBlock) => void;
  removeBlocks: (blockIds: string[]) => void;
  moveBlockUp: (blockId: string) => void;
  moveBlockDown: (blockId: string) => void;
  nestBlock: (blockId: string) => void;
  unnestBlock: (blockId: string) => void;
  
  // Text & Formatting Operations
  getSelectedText: () => string;
  insertText: (text: string) => void;
  createLink: (url: string, text?: string) => void;
  addStyles: (styles: { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean }) => void;
  removeStyles: (styles: { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean }) => void;
  
  // Cursor & Selection Operations
  getCursorPosition: () => { block: Block; prevBlock?: Block; nextBlock?: Block } | null;
  setCursorToBlock: (blockId: string, placement?: 'start' | 'end') => void;
  getSelection: () => { blocks: Block[] } | undefined;
  setSelection: (startBlockId: string, endBlockId: string) => void;
  
  // Connection Operations
  insertWikiLink: (title: string) => void;
  insertTag: (tagName: string) => void;
  insertMention: (username: string) => void;
}

export const useNoteInterface = (editor: BlockNoteEditor): NoteInterface => {
  if (!editor) {
    throw new Error('BlockNoteEditor instance is required');
  }

  const insertAtCursor = (text: string) => {
    editor.focus();
    
    try {
      // Insert text using editor's transaction API instead of directly creating blocks
      editor.transact((tr) => {
        tr.insertText(text);
      });
    } catch (error) {
      console.error("Error inserting text at cursor:", error);
      // Fallback method - alternative approach if the above fails
      try {
        const position = editor.getTextCursorPosition();
        editor.insertText(text);
      } catch (e) {
        console.error("Fallback insertion also failed:", e);
      }
    }
  };

  return {
    // Document & Block Operations
    
    getDocument: () => {
      return editor.document as Block[];
    },
    
    insertBlocks: (blocks, referenceBlockId, placement = 'before') => {
      editor.insertBlocks(blocks, referenceBlockId, placement);
    },
    
    updateBlock: (blockId, update) => {
      editor.updateBlock(blockId, update);
    },
    
    removeBlocks: (blockIds) => {
      editor.removeBlocks(blockIds);
    },
    
    moveBlockUp: (blockId) => {
      editor.moveBlocksUp();
    },
    
    moveBlockDown: (blockId) => {
      editor.moveBlocksDown();
    },
    
    nestBlock: (blockId) => {
      if (editor.canNestBlock()) {
        editor.nestBlock();
      }
    },
    
    unnestBlock: (blockId) => {
      if (editor.canUnnestBlock()) {
        editor.unnestBlock();
      }
    },
    
    // Text & Formatting Operations
    getSelectedText: () => {
      return editor.getSelectedText();
    },
    
    insertText: (text) => {
      try {
        // First try to insert at the current position
        editor.focus();
        editor.transact((tr) => {
          tr.insertText(text);
        });
      } catch (error) {
        console.error("Error inserting text:", error);
        // Fallback to a different method if needed
        try {
          const cursorPosition = editor.getTextCursorPosition();
          if (cursorPosition) {
            // Use editor.insertText if available
            editor.insertText(text);
          }
        } catch (e) {
          console.error("Fallback text insertion failed:", e);
        }
      }
    },
    
    createLink: (url, text) => {
      editor.createLink(url, text);
    },
    
    addStyles: (styles) => {
      editor.addStyles(styles);
    },
    
    removeStyles: (styles) => {
      editor.removeStyles(styles);
    },
    
    // Cursor & Selection Operations
    getCursorPosition: () => {
      const pos = editor.getTextCursorPosition();
      return pos ? {
        block: pos.block,
        prevBlock: pos.prevBlock,
        nextBlock: pos.nextBlock
      } : null;
    },
    
    setCursorToBlock: (blockId, placement = 'start') => {
      editor.setTextCursorPosition(blockId, placement);
    },
    
    getSelection: () => {
      return editor.getSelection();
    },
    
    setSelection: (startBlockId, endBlockId) => {
      editor.setSelection(startBlockId, endBlockId);
    },
    
    // Connection Operations
    insertWikiLink: (title: string) => {
      insertAtCursor(`[[${title}]]`);
    },
    
    insertTag: (tagName: string) => {
      insertAtCursor(`#${tagName}`);
    },
    
    insertMention: (username: string) => {
      insertAtCursor(`@${username}`);
    }
  };
};
