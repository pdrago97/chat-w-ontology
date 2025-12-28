import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConversationsByOrganization } from '@/lib/conversations';
import { getAgentsByOrganization } from '@/lib/agents';

// GET /api/conversations - List conversations
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const [conversations, agents] = await Promise.all([
      getConversationsByOrganization(session.organizationId, { limit: 50 }),
      getAgentsByOrganization(session.organizationId),
    ]);

    const agentMap = new Map(agents.map(a => [a.id, a.name]));
    const conversationsWithAgents = conversations.map(c => ({
      ...c,
      agent_name: agentMap.get(c.agent_id) || 'Agente desconhecido',
    }));

    return NextResponse.json({ conversations: conversationsWithAgents });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

