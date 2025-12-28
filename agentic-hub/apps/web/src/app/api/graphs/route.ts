/**
 * API Route: Knowledge Graphs
 * GET /api/graphs - List all graphs with stats
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

interface GraphRow {
  id: string;
  name: string;
  source: string;
  graph: { nodes?: unknown[]; edges?: unknown[] };
  meta: unknown;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query<GraphRow>(
      `SELECT id, name, source, graph, meta, created_at, updated_at 
       FROM knowledge_graphs 
       WHERE organization_id = $1 
       ORDER BY updated_at DESC`,
      [session.organizationId]
    );

    const graphs = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      source: row.source,
      nodeCount: row.graph?.nodes?.length || 0,
      edgeCount: row.graph?.edges?.length || 0,
      meta: row.meta,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ graphs });
  } catch (error) {
    console.error('Error fetching graphs:', error);
    return NextResponse.json({ error: 'Failed to fetch graphs' }, { status: 500 });
  }
}

