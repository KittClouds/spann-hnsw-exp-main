
import { Core, NodeSingular, ElementDefinition, ElementGroup } from 'cytoscape';
import { Note } from '@/lib/store';
import { generateNoteId } from '@/lib/utils/ids';
import { slug } from '@/lib/utils';
import { NodeType, EdgeType } from '../types';

export class NoteHandler {
  constructor(private cy: Core, private titleIndex: Map<string, string>) {}

  addNote(params: {
    id?: string;
    title: string;
    content?: any[];
    createdAt?: string;
    updatedAt?: string;
    path?: string;
  }, folderId?: string): NodeSingular {
    const nodeId = params.id && String(params.id).length >= 15 ? params.id : generateNoteId();
    const existingNode = this.cy.getElementById(nodeId);
    
    if (existingNode.nonempty()) {
      return existingNode as NodeSingular;
    }

    const now = new Date().toISOString();
    const slugTitle = slug(params.title);

    const el: ElementDefinition = {
      group: 'nodes' as ElementGroup,
      data: {
        id: nodeId,
        type: NodeType.NOTE,
        title: params.title,
        slugTitle,
        content: params.content || [],
        path: params.path || '/',
        createdAt: params.createdAt || now,
        updatedAt: params.updatedAt || now,
        parent: folderId,
        folderId: folderId
      }
    };

    const node = this.cy.add(el);
    this.titleIndex.set(slugTitle, nodeId);
    
    return node;
  }

  updateNote(id: string, updates: Partial<Note>): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.NOTE) {
      return false;
    }

    const oldTitle = node.data('title');
    const newTitle = updates.hasOwnProperty('title') ? updates.title : oldTitle;
    const slugTitle = slug(newTitle || '');

    const newData = {
      ...updates,
      slugTitle: updates.hasOwnProperty('title') ? slugTitle : undefined,
      updatedAt: new Date().toISOString()
    };

    node.data(newData);

    if (updates.hasOwnProperty('title') && oldTitle !== newTitle) {
      if (oldTitle) this.titleIndex.delete(slug(oldTitle));
      if (newTitle) this.titleIndex.set(slugTitle, id);
    }

    return true;
  }

  deleteNote(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.NOTE) {
      return false;
    }

    const slugTitle = node.data('slugTitle');
    if (slugTitle) {
      this.titleIndex.delete(slugTitle);
    }

    node.remove();
    return true;
  }
}
