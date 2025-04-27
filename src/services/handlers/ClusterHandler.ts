
import { Core, NodeSingular, ElementDefinition, ElementGroup } from 'cytoscape';
import { Cluster } from '@/lib/store';
import { generateClusterId } from '@/lib/utils/ids';
import { NodeType, EdgeType } from '../types';

export class ClusterHandler {
  constructor(
    private cy: Core, 
    private clusterExists: Set<string>
  ) {}

  addCluster(params: Partial<Cluster> = {}): NodeSingular {
    const clusterId = params.id && String(params.id).length >= 15 ? params.id : generateClusterId();
    const existingCluster = this.cy.getElementById(clusterId);
    
    if (existingCluster.nonempty()) {
      return existingCluster as NodeSingular;
    }

    const now = new Date().toISOString();

    const el: ElementDefinition = {
      group: 'nodes' as ElementGroup,
      data: {
        id: clusterId,
        type: NodeType.CLUSTER,
        title: params.title || 'Untitled Cluster',
        createdAt: params.createdAt || now,
        updatedAt: params.updatedAt || now
      }
    };

    const cluster = this.cy.add(el);
    this.clusterExists.add(clusterId);
    
    return cluster;
  }

  updateCluster(id: string, updates: Partial<Cluster>): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.CLUSTER) {
      return false;
    }

    const newData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    node.data(newData);
    return true;
  }

  deleteCluster(id: string): boolean {
    const node = this.cy.getElementById(id);
    if (node.empty() || node.data('type') !== NodeType.CLUSTER) {
      return false;
    }

    // Update member nodes
    this.cy.nodes(`[clusterId = "${id}"]`).forEach(member => {
      member.data('clusterId', undefined);
    });

    node.remove();
    this.clusterExists.delete(id);
    
    return true;
  }

  moveNodeToCluster(nodeId: string, clusterId?: string): boolean {
    const node = this.cy.getElementById(nodeId);
    if (node.empty()) {
      return false;
    }

    if (clusterId && !this.clusterExists.has(clusterId)) {
      return false;
    }

    const currentEdges = this.cy.edges(`edge[label = "${EdgeType.IN_CLUSTER}"][source = "${nodeId}"]`);
    currentEdges.remove();

    if (clusterId && this.clusterExists.has(clusterId)) {
      this.cy.add({
        group: 'edges' as ElementGroup,
        data: {
          id: `${EdgeType.IN_CLUSTER}_${nodeId}_${clusterId}`,
          source: nodeId,
          target: clusterId,
          label: EdgeType.IN_CLUSTER
        }
      });
    }

    node.data('clusterId', clusterId);
    return true;
  }
}
