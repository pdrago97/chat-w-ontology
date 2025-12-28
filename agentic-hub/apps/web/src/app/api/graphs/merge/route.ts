/**
 * API Route: Merge Multiple Graphs
 * POST /api/graphs/merge - Merge selected graphs into unified knowledge base
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

interface GraphData {
  nodes: Array<{ id: string; type: string; label: string; properties?: unknown }>;
  edges: Array<{ source: string; target: string; type: string; label?: string; weight?: number }>;
}

interface GraphRow {
  id: string;
  name: string;
  graph: GraphData;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { graphIds } = body as { graphIds: string[] };

    if (!graphIds || graphIds.length < 2) {
      return NextResponse.json({ error: 'Select at least 2 graphs to merge' }, { status: 400 });
    }

    // Fetch all selected graphs
    const result = await query<GraphRow>(
      `SELECT id, name, graph FROM knowledge_graphs 
       WHERE id = ANY($1) AND organization_id = $2`,
      [graphIds, session.organizationId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No graphs found' }, { status: 404 });
    }

    // Merge all graphs
    const mergedNodes = new Map<string, GraphData['nodes'][0]>();
    const mergedEdges: GraphData['edges'] = [];
    const edgeKeys = new Set<string>();

    for (const graph of result.rows) {
      const data = graph.graph;
      
      // Merge nodes (deduplicate by label+type)
      for (const node of data.nodes || []) {
        const key = `${node.type}:${node.label.toLowerCase()}`;
        if (!mergedNodes.has(key)) {
          mergedNodes.set(key, { ...node, id: `merged_${mergedNodes.size}` });
        }
      }
      
      // Collect edges (will need to remap IDs)
      for (const edge of data.edges || []) {
        mergedEdges.push(edge);
      }
    }

    // Remap edge source/target to merged node IDs
    const nodeIdMap = new Map<string, string>();
    for (const graph of result.rows) {
      for (const node of graph.graph.nodes || []) {
        const key = `${node.type}:${node.label.toLowerCase()}`;
        const mergedNode = mergedNodes.get(key);
        if (mergedNode) {
          nodeIdMap.set(node.id, mergedNode.id);
        }
      }
    }

    const finalEdges: GraphData['edges'] = [];
    for (const edge of mergedEdges) {
      const newSource = nodeIdMap.get(edge.source) || edge.source;
      const newTarget = nodeIdMap.get(edge.target) || edge.target;
      const edgeKey = `${newSource}-${edge.type}-${newTarget}`;
      
      if (!edgeKeys.has(edgeKey)) {
        edgeKeys.add(edgeKey);
        finalEdges.push({ ...edge, source: newSource, target: newTarget });
      }
    }

    const mergedGraph: GraphData = {
      nodes: Array.from(mergedNodes.values()),
      edges: finalEdges,
    };

    // Check if unified graph exists, update or create
    const existingUnified = await queryOne<{ id: string }>(
      `SELECT id FROM knowledge_graphs 
       WHERE organization_id = $1 AND name = 'Grafo Unificado'`,
      [session.organizationId]
    );

    let unifiedId: string;
    const sourceGraphNames = result.rows.map(g => g.name).join(', ');

    if (existingUnified) {
      await query(
        `UPDATE knowledge_graphs 
         SET graph = $1, 
             updated_at = NOW(),
             meta = jsonb_set(COALESCE(meta, '{}'), '{last_merge}', to_jsonb($2::text))
         WHERE id = $3`,
        [JSON.stringify(mergedGraph), new Date().toISOString(), existingUnified.id]
      );
      unifiedId = existingUnified.id;
    } else {
      const newGraph = await queryOne<{ id: string }>(
        `INSERT INTO knowledge_graphs (organization_id, name, graph, source, meta)
         VALUES ($1, 'Grafo Unificado', $2, 'manual', $3)
         RETURNING id`,
        [
          session.organizationId,
          JSON.stringify(mergedGraph),
          JSON.stringify({ 
            merged_from: graphIds, 
            source_names: sourceGraphNames,
            merged_at: new Date().toISOString() 
          }),
        ]
      );
      unifiedId = newGraph!.id;
    }

    return NextResponse.json({
      success: true,
      unifiedGraphId: unifiedId,
      stats: {
        graphCount: result.rows.length,
        totalNodes: mergedGraph.nodes.length,
        totalEdges: mergedGraph.edges.length,
        uniqueEntities: mergedGraph.nodes.length,
      },
    });
  } catch (error) {
    console.error('Error merging graphs:', error);
    return NextResponse.json({ error: 'Failed to merge graphs' }, { status: 500 });
  }
}

