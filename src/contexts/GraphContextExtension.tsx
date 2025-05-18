
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { graphService } from '@/services/GraphService';
import { schema, NodeDef, EdgeDef } from '@/lib/schema';
import { Entity } from '@/lib/utils/parsingUtils';

// This interface extends methods that should be added to the GraphContext
export interface GraphContextExtension {
  // Entity methods
  updateEntityAttributes: (kind: string, label: string, attributes: Record<string, any>) => boolean;
  getEntityAttributes: (kind: string, label: string) => Record<string, any> | null;
  getEntityTypes: () => Array<NodeDef & { kind: string }>;
  getRelationshipTypes: () => Array<EdgeDef & { label: string }>;
}

// Function to get entity types with their definitions
export function getEntityTypes(): Array<NodeDef & { kind: string }> {
  return schema.getAllNodeDefs().map(([kind, def]) => ({
    ...def,
    kind
  }));
}

// Function to get relationship types with their definitions
export function getRelationshipTypes(): Array<EdgeDef & { label: string }> {
  return schema.getAllEdgeDefs().map(([label, def]) => ({
    ...def,
    label
  }));
}

// Function to register a new entity type
export function registerEntityType(
  kind: string, 
  labelProp: string = 'title', 
  style: Record<string, any> = {}
): void {
  schema.registerNode(kind, {
    kind,
    labelProp,
    defaultStyle: style
  });
}

// Function to register a new relationship type
export function registerRelationshipType(
  label: string,
  fromType: string,
  toType: string,
  directed: boolean = true,
  style: Record<string, any> = {}
): void {
  schema.registerEdge(label, {
    from: fromType,
    to: toType,
    directed,
    defaultStyle: style
  });
}

// Methods to be injected into GraphContext
export const graphContextExtensionMethods: GraphContextExtension = {
  updateEntityAttributes: (kind: string, label: string, attributes: Record<string, any>): boolean => {
    return graphService.updateEntityAttributes(kind, label, attributes);
  },
  
  getEntityAttributes: (kind: string, label: string): Record<string, any> | null => {
    return graphService.getEntityAttributes(kind, label);
  },
  
  getEntityTypes,
  getRelationshipTypes
};
