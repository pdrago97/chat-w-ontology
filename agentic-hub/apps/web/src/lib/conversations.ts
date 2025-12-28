import { query, queryOne } from './db';

export interface Conversation {
  id: string;
  organization_id: string;
  agent_id: string;
  channel_id: string | null;
  channel: 'website' | 'whatsapp' | 'email' | 'slack' | 'api';
  external_id: string | null;
  customer: {
    phone?: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
  metadata: Record<string, unknown>;
  status: 'active' | 'ended' | 'handoff';
  started_at: Date;
  ended_at: Date | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  external_id: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  created_at: Date;
}

export async function getConversationsByOrganization(
  organizationId: string,
  options?: { agentId?: string; status?: string; limit?: number }
): Promise<Conversation[]> {
  let sql = `SELECT * FROM conversations WHERE organization_id = $1`;
  const params: unknown[] = [organizationId];
  let paramIndex = 2;

  if (options?.agentId) {
    sql += ` AND agent_id = $${paramIndex++}`;
    params.push(options.agentId);
  }
  if (options?.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(options.status);
  }

  sql += ` ORDER BY started_at DESC`;

  if (options?.limit) {
    sql += ` LIMIT $${paramIndex}`;
    params.push(options.limit);
  }

  const result = await query<Conversation>(sql, params);
  return result.rows;
}

export async function getConversationById(id: string, organizationId: string): Promise<Conversation | null> {
  return queryOne<Conversation>(
    `SELECT * FROM conversations WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
}

export async function createConversation(data: {
  organizationId: string;
  agentId: string;
  channel: Conversation['channel'];
  channelId?: string;
  externalId?: string;
  customer?: Conversation['customer'];
}): Promise<Conversation | null> {
  return queryOne<Conversation>(
    `INSERT INTO conversations (organization_id, agent_id, channel, channel_id, external_id, customer, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     RETURNING *`,
    [
      data.organizationId,
      data.agentId,
      data.channel,
      data.channelId || null,
      data.externalId || null,
      JSON.stringify(data.customer || {}),
    ]
  );
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const result = await query<Message>(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );
  return result.rows;
}

export async function createMessage(data: {
  conversationId: string;
  role: Message['role'];
  content: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}): Promise<Message | null> {
  return queryOne<Message>(
    `INSERT INTO messages (conversation_id, role, content, external_id, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.conversationId,
      data.role,
      data.content,
      data.externalId || null,
      JSON.stringify(data.metadata || {}),
    ]
  );
}

export async function findConversationByExternalId(
  channel: string,
  externalId: string
): Promise<Conversation | null> {
  return queryOne<Conversation>(
    `SELECT * FROM conversations 
     WHERE channel = $1 AND external_id = $2 AND status = 'active'
     ORDER BY started_at DESC LIMIT 1`,
    [channel, externalId]
  );
}

export async function updateConversationStatus(
  id: string,
  status: Conversation['status']
): Promise<Conversation | null> {
  const endedAt = status === 'ended' ? 'NOW()' : 'NULL';
  return queryOne<Conversation>(
    `UPDATE conversations SET status = $1, ended_at = ${endedAt} WHERE id = $2 RETURNING *`,
    [status, id]
  );
}

