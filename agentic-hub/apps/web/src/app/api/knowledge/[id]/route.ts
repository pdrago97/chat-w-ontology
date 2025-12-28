/**
 * API Route: Knowledge Item CRUD
 * GET /api/knowledge/[id] - Get single knowledge item
 * PUT /api/knowledge/[id] - Update knowledge item
 * DELETE /api/knowledge/[id] - Delete knowledge item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch single knowledge item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const item = await queryOne(
      `SELECT * FROM knowledge_items WHERE id = $1 AND organization_id = $2`,
      [id, session.organizationId]
    );

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching knowledge item:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

// PUT - Update knowledge item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, tags, status } = body;

    const item = await queryOne(
      `UPDATE knowledge_items 
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           tags = COALESCE($3, tags),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [title, content, tags, status, id, session.organizationId]
    );

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating knowledge item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE - Delete knowledge item and associated graph
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete associated graph first
    await query(
      `DELETE FROM knowledge_graphs WHERE meta->>'source_item_id' = $1`,
      [id]
    );

    // Delete the knowledge item
    const result = await query(
      `DELETE FROM knowledge_items WHERE id = $1 AND organization_id = $2`,
      [id, session.organizationId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting knowledge item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}

