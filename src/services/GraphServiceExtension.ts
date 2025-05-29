
import { EntityWithReferences } from '@/livestore/queries/entities';
import { GraphService } from './GraphService';
import { generateEntityId } from '@/lib/utils/ids';
import { Entity } from '@/lib/utils/parsingUtils';
import { NodeType, EdgeType } from './types';

/**
 * Extension methods for GraphService to support entity browser functionality
 * Updated to use LiveStore queries instead of Cytoscape scanning
 */
export function extendGraphService(service: GraphService): void {
  // Note: This method is now deprecated in favor of LiveStore queries
  // It's kept for backwards compatibility but should be replaced with useAllEntitiesArray()
  service.getAllEntities = function(): EntityWithReferences[] {
    console.warn('[GraphServiceExtension] getAllEntities() is deprecated. Use LiveStore queries instead.');
    
    const entities: EntityWithReferences[] = [];
    const entityNodes = this.cy.nodes(`[type = "${NodeType.ENTITY}"]`);
    
    entityNodes.forEach(node => {
      const kind = node.data('kind');
      const label = node.data('label');
      
      if (kind && label) {
        // Count references (nodes that mention this entity)
        const references = node.connectedEdges(`[label = "${EdgeType.MENTIONED_IN}"]`).length;
        
        entities.push({
          kind,
          label,
          id: generateEntityId(kind, label),
          referenceCount: references,
          referencingNotes: [],
          lastModified: node.data('lastModified') || new Date().toISOString(),
          createdAt: node.data('createdAt') || new Date().toISOString(),
          relationships: {
            asSubject: [],
            asObject: []
          }
        });
      }
    });
    
    return entities;
  };
  
  // Create entity using canonical ID generation
  service.createEntity = function(entity: Entity): boolean {
    const { kind, label } = entity;
    const entityId = generateEntityId(kind, label);
    
    // Check if entity already exists
    if (this.cy.getElementById(entityId).nonempty()) {
      return false;
    }
    
    // Add entity node with proper type
    this.cy.add({
      group: 'nodes',
      data: {
        id: entityId,
        type: NodeType.ENTITY,
        kind,
        label,
        createdAt: new Date().toISOString(),
        attributes: entity.attributes || {}
      }
    });
    
    return true;
  };
  
  // Get entity references - simplified to use direct edge queries
  service.getEntityReferences = function(kind: string, label: string): {id: string, title: string}[] {
    const entityId = generateEntityId(kind, label);
    const entityNode = this.cy.getElementById(entityId);
    
    if (entityNode.empty()) {
      return [];
    }
    
    const references: {id: string, title: string}[] = [];
    
    // Get all nodes where this entity is mentioned
    const mentionEdges = entityNode.connectedEdges(`[label = "${EdgeType.MENTIONED_IN}"]`);
    
    mentionEdges.forEach(edge => {
      const targetNode = edge.target();
      if (targetNode.data('type') === NodeType.NOTE) {
        references.push({
          id: targetNode.id(),
          title: targetNode.data('title') || 'Untitled Note'
        });
      }
    });
    
    return references;
  };
  
  // Get entity relationships using canonical IDs
  service.getEntityRelationships = function(kind: string, label: string): any[] {
    const entityId = generateEntityId(kind, label);
    const entityNode = this.cy.getElementById(entityId);
    
    if (entityNode.empty()) {
      return [];
    }
    
    const relationships: any[] = [];
    
    // Get all triple nodes where this entity is subject
    const subjectEdges = entityNode.connectedEdges(`[label = "${EdgeType.SUBJECT_OF}"]`);
    
    subjectEdges.forEach(edge => {
      const tripleNode = edge.target();
      if (tripleNode.data('type') === NodeType.TRIPLE) {
        const predicate = tripleNode.data('predicate');
        const objectEdges = tripleNode.connectedEdges(`[label = "${EdgeType.OBJECT_OF}"]`);
        
        if (objectEdges.nonempty()) {
          const objectNode = objectEdges.first().source();
          relationships.push({
            predicate,
            direction: 'outgoing',
            target: {
              kind: objectNode.data('kind'),
              label: objectNode.data('label')
            }
          });
        }
      }
    });
    
    // Get all triple nodes where this entity is object
    const objectEdges = entityNode.connectedEdges(`[label = "${EdgeType.OBJECT_OF}"]`);
    
    objectEdges.forEach(edge => {
      const tripleNode = edge.target();
      if (tripleNode.data('type') === NodeType.TRIPLE) {
        const predicate = tripleNode.data('predicate');
        const subjectEdges = tripleNode.connectedEdges(`[label = "${EdgeType.SUBJECT_OF}"]`);
        
        if (subjectEdges.nonempty()) {
          const subjectNode = subjectEdges.first().source();
          relationships.push({
            predicate,
            direction: 'incoming',
            target: {
              kind: subjectNode.data('kind'),
              label: subjectNode.data('label')
            }
          });
        }
      }
    });
    
    return relationships;
  };
}
