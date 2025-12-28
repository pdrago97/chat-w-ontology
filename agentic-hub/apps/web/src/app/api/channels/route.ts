import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getChannelsByOrganization, createChannel } from '@/lib/channels';
import { getAgentsByOrganization } from '@/lib/agents';

// GET /api/channels - List all channels
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const [channels, agents] = await Promise.all([
      getChannelsByOrganization(session.organizationId),
      getAgentsByOrganization(session.organizationId),
    ]);

    // Map agent names to channels
    const agentMap = new Map(agents.map(a => [a.id, a.name]));
    const channelsWithAgents = channels.map(c => ({
      ...c,
      agent_name: c.agent_id ? agentMap.get(c.agent_id) : null,
    }));

    return NextResponse.json({ channels: channelsWithAgents });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/channels - Create new channel
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!['owner', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = await request.json();
    const { type, name, config, credentials, agentId } = body;

    if (!type || !name) {
      return NextResponse.json({ error: 'Tipo e nome são obrigatórios' }, { status: 400 });
    }

    const validTypes = ['whatsapp', 'website', 'email', 'slack', 'telegram', 'api'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const channel = await createChannel({
      organizationId: session.organizationId,
      type,
      name: name.trim(),
      config,
      credentials,
      agentId,
    });

    if (!channel) {
      return NextResponse.json({ error: 'Erro ao criar canal' }, { status: 500 });
    }

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

