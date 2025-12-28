/**
 * API Route: Agent Knowledge Management
 * GET /api/agents/[id]/knowledge - Get knowledge items associated with agent
 * POST /api/agents/[id]/knowledge - Associate knowledge item with agent
 * DELETE /api/agents/[id]/knowledge - Remove association
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - List all knowledge items associated with this agent
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await params;

    // Verify agent belongs to organization
    const agent = await queryOne(
      `SELECT id FROM agents WHERE id = $1 AND organization_id = $2`,
      [agentId, session.organizationId]
    );

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get associated knowledge items with details
    const items = await query(
      `SELECT ki.id, ki.title, ki.content_type, ki.status, ki.created_at,
              ak.access_type, ak.enabled, ak.created_at as associated_at
       FROM agent_knowledge ak
       JOIN knowledge_items ki ON ak.knowledge_item_id = ki.id
       WHERE ak.agent_id = $1
       ORDER BY ak.created_at DESC`,
      [agentId]
    );

    return NextResponse.json({ items: items.rows });
  } catch (error) {
    console.error('Error fetching agent knowledge:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge' }, { status: 500 });
  }
}

// POST - Associate knowledge item with agent
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await params;
    const body = await request.json();
    const { knowledgeItemId, accessType = 'query' } = body;

    if (!knowledgeItemId) {
      return NextResponse.json({ error: 'knowledgeItemId required' }, { status: 400 });
    }

    // Verify agent and knowledge item belong to organization
    const [agent, knowledgeItem] = await Promise.all([
      queryOne(`SELECT id FROM agents WHERE id = $1 AND organization_id = $2`, [agentId, session.organizationId]),
      queryOne(`SELECT id FROM knowledge_items WHERE id = $1 AND organization_id = $2`, [knowledgeItemId, session.organizationId])
    ]);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    if (!knowledgeItem) {
      return NextResponse.json({ error: 'Knowledge item not found' }, { status: 404 });
    }

    // Create association (upsert)
    const association = await queryOne(
      `INSERT INTO agent_knowledge (agent_id, knowledge_item_id, access_type, enabled)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (agent_id, knowledge_item_id) 
       DO UPDATE SET access_type = $3, enabled = true
       RETURNING *`,
      [agentId, knowledgeItemId, accessType]
    );

    return NextResponse.json({ association }, { status: 201 });
  } catch (error) {
    console.error('Error associating knowledge:', error);
    return NextResponse.json({ error: 'Failed to associate knowledge' }, { status: 500 });
  }
}

// DELETE - Remove knowledge association from agent
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await params;
    const { searchParams } = new URL(request.url);
    const knowledgeItemId = searchParams.get('knowledgeItemId');

    if (!knowledgeItemId) {
      return NextResponse.json({ error: 'knowledgeItemId required' }, { status: 400 });
    }

    // Verify agent belongs to organization
    const agent = await queryOne(
      `SELECT id FROM agents WHERE id = $1 AND organization_id = $2`,
      [agentId, session.organizationId]
    );

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    await query(
      `DELETE FROM agent_knowledge WHERE agent_id = $1 AND knowledge_item_id = $2`,
      [agentId, knowledgeItemId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing knowledge association:', error);
    return NextResponse.json({ error: 'Failed to remove association' }, { status: 500 });
  }
}

