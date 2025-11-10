/**
 * Knowledge Graph Builder
 * Generates cross-feature relationship graphs and insights
 */

import { createLogger } from "../utils/logger";

const logger = createLogger("KnowledgeGraphBuilder");

/**
 * Feature node in the graph
 */
export interface FeatureNode {
  id: string;
  name: string;
  entryUrl: string;
  pageCount: number;
  actionCount: number;
  priority: number;
  metadata?: Record<string, any>;
}

/**
 * Edge between features
 */
export interface FeatureEdge {
  source: string;
  target: string;
  weight: number; // number of links
  bidirectional: boolean;
  type: "navigation" | "reference" | "cross_domain";
  metadata: {
    sourcePages: string[];
    targetPages: string[];
    linkContexts: string[];
  };
}

/**
 * Graph statistics
 */
export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  bidirectionalEdges: number;
  avgConnectionsPerNode: number;
  mostConnectedFeatures: Array<{
    id: string;
    connectionCount: number;
  }>;
  isolatedFeatures: string[];
}

/**
 * Knowledge graph structure
 */
export interface KnowledgeGraph {
  metadata: {
    createdAt: Date;
    appBaseUrl: string;
    featureCount: number;
    pageCount: number;
  };
  nodes: Map<string, FeatureNode>;
  edges: Map<string, FeatureEdge>;
  statistics: GraphStatistics;
}

/**
 * Knowledge graph builder class
 */
export class KnowledgeGraphBuilder {
  private graph: KnowledgeGraph;
  private edgeMap: Map<string, FeatureEdge> = new Map(); // source->target => edge

  constructor(baseUrl: string) {
    this.graph = {
      metadata: {
        createdAt: new Date(),
        appBaseUrl: baseUrl,
        featureCount: 0,
        pageCount: 0,
      },
      nodes: new Map(),
      edges: new Map(),
      statistics: {
        totalNodes: 0,
        totalEdges: 0,
        bidirectionalEdges: 0,
        avgConnectionsPerNode: 0,
        mostConnectedFeatures: [],
        isolatedFeatures: [],
      },
    };
  }

  /**
   * Add feature node
   */
  addFeature(node: FeatureNode): void {
    this.graph.nodes.set(node.id, node);
    logger.debug(`Feature node added: ${node.id}`);
  }

  /**
   * Add cross-feature connection
   */
  addConnection(
    sourceFeatureId: string,
    targetFeatureId: string,
    weight: number = 1,
    sourcePage?: string,
    targetPage?: string,
    context?: string
  ): void {
    if (sourceFeatureId === targetFeatureId) {
      return; // Skip self-loops
    }

    const edgeKey = `${sourceFeatureId}->${targetFeatureId}`;
    const reverseEdgeKey = `${targetFeatureId}->${sourceFeatureId}`;

    let edge = this.edgeMap.get(edgeKey);

    if (!edge) {
      edge = {
        source: sourceFeatureId,
        target: targetFeatureId,
        weight,
        bidirectional: false,
        type: "navigation",
        metadata: {
          sourcePages: [],
          targetPages: [],
          linkContexts: [],
        },
      };

      this.edgeMap.set(edgeKey, edge);
    } else {
      edge.weight += weight;
    }

    // Track pages and context
    if (sourcePage && !edge.metadata.sourcePages.includes(sourcePage)) {
      edge.metadata.sourcePages.push(sourcePage);
    }
    if (targetPage && !edge.metadata.targetPages.includes(targetPage)) {
      edge.metadata.targetPages.push(targetPage);
    }
    if (context && !edge.metadata.linkContexts.includes(context)) {
      edge.metadata.linkContexts.push(context);
    }

    // Check for bidirectional
    const reverseEdge = this.edgeMap.get(reverseEdgeKey);
    if (reverseEdge) {
      edge.bidirectional = true;
      reverseEdge.bidirectional = true;
    }

    logger.debug(
      `Connection added: ${sourceFeatureId} -> ${targetFeatureId} (weight: ${edge.weight})`
    );
  }

  /**
   * Build graph after exploration
   */
  finalize(): KnowledgeGraph {
    // Update edges map
    this.graph.edges.clear();
    this.edgeMap.forEach((edge, key) => {
      this.graph.edges.set(key, edge);
    });

    // Calculate statistics
    this.calculateStatistics();

    logger.info(
      `Knowledge graph finalized: ${this.graph.statistics.totalNodes} nodes, ${this.graph.statistics.totalEdges} edges`
    );

    return this.graph;
  }

  /**
   * Get feature connectivity
   */
  getFeatureConnectivity(featureId: string): {
    outgoing: number;
    incoming: number;
    bidirectional: number;
  } {
    let outgoing = 0;
    let incoming = 0;
    let bidirectional = 0;

    this.graph.edges.forEach((edge) => {
      if (edge.source === featureId) {
        outgoing++;
        if (edge.bidirectional) {
          bidirectional++;
        }
      }
      if (edge.target === featureId) {
        incoming++;
      }
    });

    return { outgoing, incoming, bidirectional };
  }

  /**
   * Find shortest path between features
   */
  findPath(
    sourceId: string,
    targetId: string,
    maxDepth: number = 5
  ): string[] | null {
    const visited = new Set<string>();
    const queue: Array<{ node: string; path: string[] }> = [
      { node: sourceId, path: [sourceId] },
    ];

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node === targetId) {
        return path;
      }

      if (path.length > maxDepth || visited.has(node)) {
        continue;
      }

      visited.add(node);

      // Find outgoing edges
      this.graph.edges.forEach((edge) => {
        if (edge.source === node && !visited.has(edge.target)) {
          queue.push({ node: edge.target, path: [...path, edge.target] });
        }
      });
    }

    return null;
  }

  /**
   * Get graph clusters (connected components)
   */
  getClusters(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    const visited = new Set<string>();
    let clusterId = 0;

    // DFS to find connected components
    const dfs = (nodeId: string, cluster: string[]): void => {
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      cluster.push(nodeId);

      // Find all connected nodes
      this.graph.edges.forEach((edge) => {
        if (edge.source === nodeId && !visited.has(edge.target)) {
          dfs(edge.target, cluster);
        }
        if (edge.target === nodeId && !visited.has(edge.source)) {
          dfs(edge.source, cluster);
        }
      });
    };

    // Process all nodes
    this.graph.nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        const cluster: string[] = [];
        dfs(node.id, cluster);

        if (cluster.length > 0) {
          clusters.set(`cluster_${clusterId++}`, cluster);
        }
      }
    });

    logger.info(`Found ${clusters.size} connected clusters`);

    return clusters;
  }

  /**
   * Analyze feature importance
   */
  getFeatureImportance(): Array<{
    featureId: string;
    importance: number;
    inboundCount: number;
    outboundCount: number;
  }> {
    const importance: Map<
      string,
      {
        featureId: string;
        importance: number;
        inboundCount: number;
        outboundCount: number;
      }
    > = new Map();

    // Initialize
    this.graph.nodes.forEach((node) => {
      importance.set(node.id, {
        featureId: node.id,
        importance: 0,
        inboundCount: 0,
        outboundCount: 0,
      });
    });

    // Count connections
    this.graph.edges.forEach((edge) => {
      const source = importance.get(edge.source);
      const target = importance.get(edge.target);

      if (source) {
        source.outboundCount += edge.weight;
      }
      if (target) {
        target.inboundCount += edge.weight;
      }
    });

    // Calculate importance score
    // (weighted by both inbound and outbound connections)
    importance.forEach((item) => {
      item.importance =
        item.inboundCount * 0.6 + item.outboundCount * 0.4; // Inbound weighted higher
    });

    // Sort by importance
    return Array.from(importance.values()).sort(
      (a, b) => b.importance - a.importance
    );
  }

  /**
   * Get knowledge graph as object
   */
  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  /**
   * Export as JSON
   */
  toJSON(): any {
    return {
      metadata: {
        ...this.graph.metadata,
        createdAt: this.graph.metadata.createdAt.toISOString(),
      },
      nodes: Object.fromEntries(this.graph.nodes),
      edges: Array.from(this.graph.edges.values()),
      statistics: this.graph.statistics,
      analysis: {
        featureImportance: this.getFeatureImportance(),
        clusters: Array.from(this.getClusters().entries()).map(([id, nodes]) => ({
          clusterId: id,
          featureCount: nodes.length,
          features: nodes,
        })),
      },
    };
  }

  /**
   * Private helper: Calculate statistics
   */
  private calculateStatistics(): void {
    const stats: GraphStatistics = {
      totalNodes: this.graph.nodes.size,
      totalEdges: this.graph.edges.size,
      bidirectionalEdges: Array.from(this.graph.edges.values()).filter(
        (e) => e.bidirectional
      ).length,
      avgConnectionsPerNode: 0,
      mostConnectedFeatures: [],
      isolatedFeatures: [],
    };

    // Calculate average connections
    if (stats.totalNodes > 0) {
      stats.avgConnectionsPerNode = (stats.totalEdges * 2) / stats.totalNodes;
    }

    // Find most connected features
    const connectivity: Array<{
      featureId: string;
      connectionCount: number;
    }> = [];

    this.graph.nodes.forEach((node) => {
      let count = 0;

      this.graph.edges.forEach((edge) => {
        if (edge.source === node.id || edge.target === node.id) {
          count += edge.weight;
        }
      });

      connectivity.push({ featureId: node.id, connectionCount: count });
    });

    stats.mostConnectedFeatures = connectivity
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, 5)
      .map(item => ({
        id: item.featureId,
        connectionCount: item.connectionCount
      }));

    // Find isolated features
    const connectedFeatures = new Set<string>();
    this.graph.edges.forEach((edge) => {
      connectedFeatures.add(edge.source);
      connectedFeatures.add(edge.target);
    });

    this.graph.nodes.forEach((node) => {
      if (!connectedFeatures.has(node.id)) {
        stats.isolatedFeatures.push(node.id);
      }
    });

    this.graph.statistics = stats;
  }
}

/**
 * Create knowledge graph builder
 */
export function createKnowledgeGraphBuilder(
  baseUrl: string
): KnowledgeGraphBuilder {
  return new KnowledgeGraphBuilder(baseUrl);
}
