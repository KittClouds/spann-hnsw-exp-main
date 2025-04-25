
import { useState } from 'react';
import { BlockNoteEditor, Block, PartialBlock } from '@blocknote/core';
import { toast } from 'sonner';

// Define valid BlockNote block types to ensure type safety
export type BlockType = 
  | "paragraph"
  | "heading"
  | "heading-2"
  | "heading-3"
  | "bulletList"
  | "numberedList"
  | "codeBlock"
  | "quote"
  | "table"
  | "image"
  | "video"
  | "audio";

export const useNoteOperations = (editor: BlockNoteEditor | null) => {
  const [selectedBlocks, setSelectedBlocks] = useState<Block[]>([]);
  
  // Document operations
  const getDocument = () => {
    if (!editor) return [];
    return editor.document;
  };
  
  // Block manipulation
  const insertBlock = (blockToInsert: PartialBlock, position: "before" | "after" = "after") => {
    if (!editor) return;
    
    try {
      const currentBlock = editor.getTextCursorPosition().block;
      editor.insertBlocks([blockToInsert], currentBlock, position);
      toast("Block inserted");
      return true;
    } catch (error) {
      console.error("Failed to insert block:", error);
      toast("Failed to insert block");
      return false;
    }
  };
  
  const updateCurrentBlock = (update: Partial<Block>) => {
    if (!editor) return false;
    
    try {
      const currentBlock = editor.getTextCursorPosition().block;
      editor.updateBlock(currentBlock, update);
      return true;
    } catch (error) {
      console.error("Failed to update block:", error);
      return false;
    }
  };
  
  const removeCurrentBlock = () => {
    if (!editor) return false;
    
    try {
      const currentBlock = editor.getTextCursorPosition().block;
      editor.removeBlocks([currentBlock]);
      toast("Block removed");
      return true;
    } catch (error) {
      console.error("Failed to remove block:", error);
      toast("Failed to remove block");
      return false;
    }
  };
  
  const changeBlockType = (type: BlockType) => {
    if (!editor) return false;
    return updateCurrentBlock({ type });
  };
  
  // Nesting operations
  const indentBlock = () => {
    if (!editor) return false;
    
    if (editor.canNestBlock()) {
      editor.nestBlock();
      return true;
    }
    return false;
  };
  
  const outdentBlock = () => {
    if (!editor) return false;
    
    if (editor.canUnnestBlock()) {
      editor.unnestBlock();
      return true;
    }
    return false;
  };
  
  // Style operations
  const toggleStyle = (style: Record<string, any>) => {
    if (!editor) return;
    editor.toggleStyles(style);
  };
  
  // Selection operations
  const getCurrentBlockInfo = () => {
    if (!editor) return null;
    
    const position = editor.getTextCursorPosition();
    return {
      current: position.block,
      prev: position.prevBlock,
      next: position.nextBlock
    };
  };
  
  const getSelection = () => {
    if (!editor) return [];
    
    const selection = editor.getSelection();
    if (selection) {
      setSelectedBlocks(selection.blocks);
      return selection.blocks;
    }
    
    const block = editor.getTextCursorPosition().block;
    setSelectedBlocks([block]);
    return [block];
  };
  
  // Insertion operations
  const insertLink = (url: string, text?: string) => {
    if (!editor) return;
    editor.createLink(url, text);
  };
  
  return {
    // Document
    getDocument,
    
    // Block manipulation
    insertBlock,
    updateCurrentBlock,
    removeCurrentBlock,
    changeBlockType,
    
    // Nesting
    indentBlock,
    outdentBlock,
    
    // Styles
    toggleStyle,
    
    // Selection
    getCurrentBlockInfo,
    getSelection,
    selectedBlocks,
    
    // Insertion
    insertLink
  };
};
