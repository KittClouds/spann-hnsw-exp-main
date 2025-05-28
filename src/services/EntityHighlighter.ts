
import { BlockNoteEditor, Block } from '@blocknote/core';
import { parseNoteConnections } from '@/lib/utils/parsingUtils';

export class EntityHighlighter {
  private editor: BlockNoteEditor;
  private isProcessing = false;

  constructor(editor: BlockNoteEditor) {
    this.editor = editor;
  }

  // Process a block and replace entity syntax with styled inline components
  public processBlock(block: Block) {
    if (this.isProcessing || block.type !== 'paragraph') return;
    
    this.isProcessing = true;
    
    try {
      // Extract text content from the block
      const textContent = this.extractTextFromBlock(block);
      if (!textContent) {
        this.isProcessing = false;
        return;
      }

      // Parse entities from the text
      const connections = parseNoteConnections([block]);
      
      // Create replacement operations (process in reverse order to maintain positions)
      const replacements: Array<{
        from: number;
        to: number;
        type: string;
        props: Record<string, any>;
      }> = [];

      // Process triples first (they contain entities)
      connections.triples.forEach(triple => {
        const triplePattern = new RegExp(
          `\\[${triple.subject.kind}\\|${triple.subject.label}(?:\\|[^\\]]*)?\\]\\s*\\(${triple.predicate}\\)\\s*\\[${triple.object.kind}\\|${triple.object.label}(?:\\|[^\\]]*)?\\]`,
          'g'
        );
        
        let match;
        while ((match = triplePattern.exec(textContent)) !== null) {
          replacements.push({
            from: match.index,
            to: match.index + match[0].length,
            type: "triple",
            props: {
              subjectKind: triple.subject.kind,
              subjectLabel: triple.subject.label,
              predicate: triple.predicate,
              objectKind: triple.object.kind,
              objectLabel: triple.object.label
            }
          });
        }
      });

      // Process standalone entities (skip those already in triples)
      connections.entities.forEach(entity => {
        const entityPattern = new RegExp(
          `\\[${entity.kind}\\|${entity.label}(?:\\|[^\\]]*)?\\]`,
          'g'
        );
        
        let match;
        while ((match = entityPattern.exec(textContent)) !== null) {
          // Check if this entity is part of a triple
          const isPartOfTriple = replacements.some(r => 
            match!.index >= r.from && match!.index + match![0].length <= r.to
          );
          
          if (!isPartOfTriple) {
            replacements.push({
              from: match.index,
              to: match.index + match[0].length,
              type: "entity",
              props: {
                kind: entity.kind,
                label: entity.label,
                attributes: entity.attributes ? JSON.stringify(entity.attributes) : ""
              }
            });
          }
        }
      });

      // Process wiki links
      connections.links.forEach(link => {
        const linkPattern = /\[\[\s*([^\]\s|][^\]|]*?)\s*(?:\|[^\]]*)?\]\]/g;
        
        let match;
        while ((match = linkPattern.exec(textContent)) !== null) {
          const isPartOfEntity = replacements.some(r => 
            match!.index >= r.from && match!.index + match![0].length <= r.to
          );
          
          if (!isPartOfEntity) {
            replacements.push({
              from: match.index,
              to: match.index + match[0].length,
              type: "wikilink",
              props: {
                text: link
              }
            });
          }
        }
      });

      // Process tags
      connections.tags.forEach(tag => {
        const tagPattern = new RegExp(`#${tag}\\b`, 'g');
        
        let match;
        while ((match = tagPattern.exec(textContent)) !== null) {
          const isPartOfOther = replacements.some(r => 
            match!.index >= r.from && match!.index + match![0].length <= r.to
          );
          
          if (!isPartOfOther) {
            replacements.push({
              from: match.index,
              to: match.index + match[0].length,
              type: "tag",
              props: {
                text: tag
              }
            });
          }
        }
      });

      // Process mentions
      connections.mentions.forEach(mention => {
        const mentionPattern = new RegExp(`@${mention}\\b`, 'g');
        
        let match;
        while ((match = mentionPattern.exec(textContent)) !== null) {
          const isPartOfOther = replacements.some(r => 
            match!.index >= r.from && match!.index + match![0].length <= r.to
          );
          
          if (!isPartOfOther) {
            replacements.push({
              from: match.index,
              to: match.index + match[0].length,
              type: "mention",
              props: {
                text: mention
              }
            });
          }
        }
      });

      // Apply replacements using BlockNote's replaceInlineContent method
      // Sort in reverse order to maintain positions
      replacements
        .sort((a, b) => b.from - a.from)
        .forEach(replacement => {
          try {
            this.editor.replaceInlineContent(block.id, replacement.from, replacement.to, [{
              type: replacement.type,
              props: replacement.props
            }]);
          } catch (error) {
            console.warn('EntityHighlighter: Error replacing inline content', error);
          }
        });

    } catch (error) {
      console.warn('EntityHighlighter: Error processing block', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private extractTextFromBlock(block: Block): string {
    if (!block.content || !Array.isArray(block.content)) return '';
    
    return block.content.map(item => {
      if (item.type === 'text') {
        return 'text' in item ? item.text : '';
      }
      return '';
    }).join('');
  }

  // Debounced processing for performance
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  
  public processBlockDebounced(block: Block, delay = 300) {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      this.processBlock(block);
    }, delay);
  }
}
