import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createGraphNode } from '@/lib/knowledge';
import { query, queryOne } from '@/lib/db';
import * as falkor from '@/lib/falkordb';

interface KnowledgeGraphRow {
  id: string;
  name: string;
  graph: {
    nodes: Array<{ id: string; type: string; label: string; properties?: Record<string, unknown> }>;
    edges: Array<{ source: string; target: string; type: string; label?: string; weight?: number }>;
  };
}

// GET /api/graph - Get unified graph or specific graph
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const mode = searchParams.get('mode') || 'unified'; // 'unified' | 'single' | 'all'

    let graphs: KnowledgeGraphRow[] = [];

    if (graphId) {
      // Fetch specific graph
      const graph = await queryOne<KnowledgeGraphRow>(
        `SELECT id, name, graph FROM knowledge_graphs WHERE id = $1 AND organization_id = $2`,
        [graphId, session.organizationId]
      );
      if (graph) graphs = [graph];
    } else if (mode === 'unified') {
      // Try to get unified graph first, otherwise merge all
      const unified = await queryOne<KnowledgeGraphRow>(
        `SELECT id, name, graph FROM knowledge_graphs WHERE organization_id = $1 AND name = 'Grafo Unificado'`,
        [session.organizationId]
      );
      if (unified) {
        graphs = [unified];
      } else {
        // Fallback: get all graphs
        const result = await query<KnowledgeGraphRow>(
          `SELECT id, name, graph FROM knowledge_graphs WHERE organization_id = $1`,
          [session.organizationId]
        );
        graphs = result.rows;
      }
    } else {
      // Get all graphs
      const result = await query<KnowledgeGraphRow>(
        `SELECT id, name, graph FROM knowledge_graphs WHERE organization_id = $1`,
        [session.organizationId]
      );
      graphs = result.rows;
    }

    // Merge all graphs into single visualization
    const allNodes: Array<{ id: string; name: string; label: string; color: string; properties?: unknown }> = [];
    const allEdges: Array<{ source: string; target: string; relation: string; label: string; weight: number }> = [];
    const seenNodes = new Set<string>();
    const seenEdges = new Set<string>();

    for (const g of graphs) {
      if (!g.graph) continue;

      for (const node of g.graph.nodes || []) {
        if (!seenNodes.has(node.id)) {
          seenNodes.add(node.id);
          allNodes.push({
            id: node.id,
            name: node.label,
            label: node.type,
            color: getLabelColor(node.type),
            properties: node.properties,
          });
        }
      }

      for (const edge of g.graph.edges || []) {
        const edgeKey = `${edge.source}-${edge.type}-${edge.target}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          allEdges.push({
            source: edge.source,
            target: edge.target,
            relation: edge.type,
            label: edge.label || edge.type,
            weight: edge.weight || 1,
          });
        }
      }
    }

    return NextResponse.json({
      nodes: allNodes,
      edges: allEdges,
      meta: {
        graphCount: graphs.length,
        nodeCount: allNodes.length,
        edgeCount: allEdges.length,
      },
    });
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/graph/node - Create a new node
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'create_node') {
      const { nodeId, label, name, description, properties } = data;

      if (!nodeId || !label || !name) {
        return NextResponse.json({ error: 'nodeId, label e name são obrigatórios' }, { status: 400 });
      }

      // Save to PostgreSQL
      const node = await createGraphNode({
        organizationId: session.organizationId,
        nodeId,
        label,
        name,
        description,
        properties,
      });

      // Also create in FalkorDB for fast graph queries
      const graphName = `org_${session.organizationId.replace(/-/g, '_')}`;
      await falkor.createNode(graphName, nodeId, label, { name, description, ...properties });

      return NextResponse.json({ node }, { status: 201 });
    }

    if (action === 'create_edge') {
      const { sourceId, targetId, relationType, label: edgeLabel, weight } = data;

      if (!sourceId || !targetId || !relationType) {
        return NextResponse.json({ error: 'sourceId, targetId e relationType são obrigatórios' }, { status: 400 });
      }

      // Get node IDs from node_id
      const nodes = await query<{ id: string; node_id: string }>(
        `SELECT id, node_id FROM graph_nodes WHERE organization_id = $1 AND node_id IN ($2, $3)`,
        [session.organizationId, sourceId, targetId]
      );

      if (nodes.rows.length < 2) {
        return NextResponse.json({ error: 'Nodes não encontrados' }, { status: 404 });
      }

      const sourceNode = nodes.rows.find(n => n.node_id === sourceId);
      const targetNode = nodes.rows.find(n => n.node_id === targetId);

      // Save edge to PostgreSQL
      const edge = await query(
        `INSERT INTO graph_edges 
         (organization_id, source_node_id, target_node_id, relation_type, label, weight)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (organization_id, source_node_id, target_node_id, relation_type) DO UPDATE SET
           label = EXCLUDED.label, weight = EXCLUDED.weight
         RETURNING *`,
        [session.organizationId, sourceNode?.id, targetNode?.id, relationType, edgeLabel, weight || 1.0]
      );

      // Also create in FalkorDB
      const graphName = `org_${session.organizationId.replace(/-/g, '_')}`;
      await falkor.createEdge(graphName, sourceId, targetId, relationType, { weight });

      return NextResponse.json({ edge: edge.rows[0] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Error modifying graph:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

function getLabelColor(label: string): string {
  const colors: Record<string, string> = {
    Person: '#4ade80',
    Organization: '#60a5fa',
    Concept: '#f472b6',
    Product: '#fbbf24',
    Location: '#a78bfa',
    Event: '#f87171',
    Document: '#34d399',
    Skill: '#fb923c',
    Tool: '#e879f9',
    default: '#94a3b8',
  };
  return colors[label] || colors.default;
}

