import { query, queryOne } from './db';

export interface Channel {
  id: string;
  organization_id: string;
  type: 'whatsapp' | 'website' | 'email' | 'slack' | 'telegram' | 'api';
  name: string;
  config: Record<string, unknown>;
  credentials: {
    api_key?: string;
    instance_id?: string;
    webhook_secret?: string;
    [key: string]: unknown;
  };
  status: 'connected' | 'disconnected' | 'error';
  agent_id: string | null;
  last_sync_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getChannelsByOrganization(organizationId: string): Promise<Channel[]> {
  const result = await query<Channel>(
    `SELECT * FROM channels WHERE organization_id = $1 ORDER BY created_at DESC`,
    [organizationId]
  );
  return result.rows;
}

export async function getChannelById(id: string, organizationId: string): Promise<Channel | null> {
  return queryOne<Channel>(
    `SELECT * FROM channels WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
}

export async function createChannel(data: {
  organizationId: string;
  type: Channel['type'];
  name: string;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  agentId?: string;
}): Promise<Channel | null> {
  return queryOne<Channel>(
    `INSERT INTO channels (organization_id, type, name, config, credentials, agent_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'disconnected')
     RETURNING *`,
    [
      data.organizationId,
      data.type,
      data.name,
      JSON.stringify(data.config || {}),
      JSON.stringify(data.credentials || {}),
      data.agentId || null,
    ]
  );
}

export async function updateChannel(
  id: string,
  organizationId: string,
  data: Partial<{
    name: string;
    config: Record<string, unknown>;
    credentials: Record<string, unknown>;
    status: Channel['status'];
    agentId: string | null;
  }>
): Promise<Channel | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.config !== undefined) {
    fields.push(`config = $${paramIndex++}`);
    values.push(JSON.stringify(data.config));
  }
  if (data.credentials !== undefined) {
    fields.push(`credentials = $${paramIndex++}`);
    values.push(JSON.stringify(data.credentials));
  }
  if (data.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.agentId !== undefined) {
    fields.push(`agent_id = $${paramIndex++}`);
    values.push(data.agentId);
  }

  if (fields.length === 0) return getChannelById(id, organizationId);

  fields.push(`updated_at = NOW()`);
  values.push(id, organizationId);

  return queryOne<Channel>(
    `UPDATE channels SET ${fields.join(', ')} 
     WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
     RETURNING *`,
    values
  );
}

export async function deleteChannel(id: string, organizationId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM channels WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return result.rowCount ? result.rowCount > 0 : false;
}

export async function getChannelByExternalId(type: string, externalId: string): Promise<(Channel & { org_id: string }) | null> {
  return queryOne<Channel & { org_id: string }>(
    `SELECT c.*, c.organization_id as org_id FROM channels c 
     WHERE c.type = $1 AND c.credentials->>'instance_id' = $2 AND c.status = 'connected'`,
    [type, externalId]
  );
}

