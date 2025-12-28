/**
 * API Route: Generate/Get Graph from Knowledge Item
 * POST /api/knowledge/[id]/graph - Generate graph from document (with optional file upload)
 * GET /api/knowledge/[id]/graph - Get existing graph for document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { extractGraphFromText, extractGraphFromFile } from '@/lib/graph-extractor';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch graph associated with this knowledge item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the knowledge graph for this item
    const graph = await queryOne<{ id: string; name: string; graph: unknown }>(
      `SELECT kg.id, kg.name, kg.graph
       FROM knowledge_graphs kg
       WHERE kg.meta->>'source_item_id' = $1 AND kg.organization_id = $2`,
      [id, session.organizationId]
    );

    if (!graph) {
      return NextResponse.json({ graph: null, message: 'No graph generated yet' });
    }

    return NextResponse.json({ graph });
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 });
  }
}

// POST - Generate graph from knowledge item content or file
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the knowledge item with file data
    const item = await queryOne<{
      id: string;
      title: string;
      content: string;
      organization_id: string;
      file_data: Buffer | null;
      file_name: string | null;
      file_type: string | null;
    }>(
      `SELECT id, title, content, organization_id, file_data, file_name, file_type
       FROM knowledge_items
       WHERE id = $1 AND organization_id = $2`,
      [id, session.organizationId]
    );

    if (!item) {
      return NextResponse.json({ error: 'Knowledge item not found' }, { status: 404 });
    }

    // Extract entities and relations - prefer file if available
    let extraction;
    if (item.file_data && item.file_name && item.file_type) {
      console.log(`Extracting graph from file: ${item.file_name} (${item.file_type})`);
      extraction = await extractGraphFromFile(
        Buffer.from(item.file_data),
        item.file_name,
        item.file_type
      );
    } else if (item.content && item.content.trim().length > 10) {
      console.log(`Extracting graph from text content`);
      extraction = await extractGraphFromText(item.content, item.title);
    } else {
      return NextResponse.json({
        error: 'Nenhum conteúdo disponível para extrair grafo. Faça upload de um arquivo.',
      }, { status: 400 });
    }

    // Build graph structure
    const graphData = {
      nodes: extraction.entities.map(e => ({
        id: e.id,
        type: e.type,
        label: e.label,
        properties: e.properties,
      })),
      edges: extraction.relations.map(r => ({
        source: r.source,
        target: r.target,
        type: r.type,
        label: r.label,
        weight: r.weight,
      })),
    };

    // Check if graph already exists for this item
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM knowledge_graphs WHERE meta->>'source_item_id' = $1`,
      [id]
    );

    let graphId: string;

    if (existing) {
      // Update existing graph
      await query(
        `UPDATE knowledge_graphs SET graph = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(graphData), existing.id]
      );
      graphId = existing.id;
    } else {
      // Create new graph
      const result = await queryOne<{ id: string }>(
        `INSERT INTO knowledge_graphs (organization_id, name, graph, source, meta)
         VALUES ($1, $2, $3, 'manual', $4)
         RETURNING id`,
        [
          session.organizationId,
          `Grafo: ${item.title}`,
          JSON.stringify(graphData),
          JSON.stringify({ source_item_id: id, generated_at: new Date().toISOString() }),
        ]
      );
      graphId = result!.id;
    }

    return NextResponse.json({
      success: true,
      graphId,
      stats: {
        entities: extraction.entities.length,
        relations: extraction.relations.length,
      },
      graph: graphData,
    });
  } catch (error) {
    console.error('Error generating graph:', error);
    return NextResponse.json({ error: 'Failed to generate graph' }, { status: 500 });
  }
}

