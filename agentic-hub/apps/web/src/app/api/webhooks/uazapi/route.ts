import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { UazapiService, type WebhookPayload, createUazapiService } from '@/lib/uazapi';
import { createConversation, findConversationByExternalId, createMessage } from '@/lib/conversations';
import { getAgentById } from '@/lib/agents';

// Log webhook for debugging
async function logWebhook(
  organizationId: string | null,
  channelId: string | null,
  direction: 'inbound' | 'outbound',
  payload: unknown,
  response?: unknown,
  statusCode?: number,
  error?: string
) {
  try {
    await query(
      `INSERT INTO webhook_logs (organization_id, channel_id, direction, payload, response, status_code, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [organizationId, channelId, direction, JSON.stringify(payload), JSON.stringify(response), statusCode, error]
    );
  } catch (e) {
    console.error('Failed to log webhook:', e);
  }
}

// POST /api/webhooks/uazapi - Receive WhatsApp messages
export async function POST(request: NextRequest) {
  let payload: WebhookPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Parse the message
  const parsed = UazapiService.parseWebhookMessage(payload);
  if (!parsed || parsed.isFromMe) {
    // Ignore outgoing messages or non-message events
    return NextResponse.json({ status: 'ignored' });
  }

  const { phone, name, text, messageId } = parsed;
  const instanceId = payload.instanceId;

  // Find channel by instance ID
  const channel = await queryOne<{
    id: string;
    organization_id: string;
    agent_id: string | null;
    credentials: { api_key?: string; instance_id?: string; base_url?: string };
  }>(
    `SELECT id, organization_id, agent_id, credentials FROM channels 
     WHERE type = 'whatsapp' AND credentials->>'instance_id' = $1 AND status = 'connected'`,
    [instanceId]
  );

  if (!channel) {
    await logWebhook(null, null, 'inbound', payload, null, 404, 'Channel not found');
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  if (!channel.agent_id) {
    await logWebhook(channel.organization_id, channel.id, 'inbound', payload, null, 400, 'No agent assigned');
    return NextResponse.json({ error: 'No agent assigned to channel' }, { status: 400 });
  }

  // Log inbound message
  await logWebhook(channel.organization_id, channel.id, 'inbound', payload, null, 200);

  // Find or create conversation
  let conversation = await findConversationByExternalId('whatsapp', phone);
  
  if (!conversation) {
    conversation = await createConversation({
      organizationId: channel.organization_id,
      agentId: channel.agent_id,
      channel: 'whatsapp',
      channelId: channel.id,
      externalId: phone,
      customer: { phone, name },
    });
  }

  if (!conversation) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }

  // Save user message
  await createMessage({
    conversationId: conversation.id,
    role: 'user',
    content: text,
    externalId: messageId,
    metadata: { phone, name },
  });

  // Get agent to generate response
  const agent = await getAgentById(channel.agent_id, channel.organization_id);
  if (!agent || agent.status !== 'active') {
    return NextResponse.json({ status: 'agent_inactive' });
  }

  // TODO: Integrate with LLM for actual response generation
  // For now, generate a mock response based on agent persona
  const persona = agent.persona || {};
  const greeting = persona.tone === 'friendly' ? 'Oi!' : 'Olá!';
  const agentResponse = `${greeting} Recebi sua mensagem: "${text.substring(0, 50)}...". Em breve retornarei com uma resposta.`;

  // Save assistant message
  const savedResponse = await createMessage({
    conversationId: conversation.id,
    role: 'assistant',
    content: agentResponse,
  });

  // Send response via UAZAPI
  const uazapi = createUazapiService(channel.credentials);
  if (uazapi && savedResponse) {
    try {
      const result = await uazapi.sendText({ phone, message: agentResponse });
      
      // Update message with external ID
      await query(
        `UPDATE messages SET external_id = $1, status = 'sent' WHERE id = $2`,
        [result.key.id, savedResponse.id]
      );

      await logWebhook(channel.organization_id, channel.id, 'outbound', { phone, message: agentResponse }, result, 200);
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      await query(`UPDATE messages SET status = 'failed' WHERE id = $1`, [savedResponse.id]);
      await logWebhook(channel.organization_id, channel.id, 'outbound', { phone, message: agentResponse }, null, 500, String(error));
    }
  }

  return NextResponse.json({ status: 'ok', conversationId: conversation.id });
}

// GET for webhook verification (some services require this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge');
  
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: 'webhook_active' });
}

