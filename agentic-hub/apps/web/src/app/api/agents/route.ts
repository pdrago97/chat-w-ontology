import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAgentsByOrganization, createAgent } from '@/lib/agents';

// GET /api/agents - List all agents for organization
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const agents = await getAgentsByOrganization(session.organizationId);
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/agents - Create new agent
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Only owner/admin can create agents
    if (!['owner', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, persona } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const agent = await createAgent({
      organizationId: session.organizationId,
      name: name.trim(),
      description: description?.trim(),
      persona,
    });

    if (!agent) {
      return NextResponse.json({ error: 'Erro ao criar agente' }, { status: 500 });
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

