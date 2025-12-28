import { query, queryOne } from './db';

export interface Agent {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  persona: {
    tone?: string;
    language?: string;
    instructions?: string;
  };
  knowledge_graph_id: string | null;
  channels: string[];
  status: 'draft' | 'training' | 'active' | 'paused';
  config: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export async function getAgentsByOrganization(organizationId: string): Promise<Agent[]> {
  const result = await query<Agent>(
    `SELECT * FROM agents WHERE organization_id = $1 ORDER BY created_at DESC`,
    [organizationId]
  );
  return result.rows;
}

export async function getAgentById(id: string, organizationId: string): Promise<Agent | null> {
  return queryOne<Agent>(
    `SELECT * FROM agents WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
}

export async function createAgent(data: {
  organizationId: string;
  name: string;
  description?: string;
  persona?: Agent['persona'];
}): Promise<Agent | null> {
  return queryOne<Agent>(
    `INSERT INTO agents (organization_id, name, description, persona, status)
     VALUES ($1, $2, $3, $4, 'draft')
     RETURNING *`,
    [
      data.organizationId,
      data.name,
      data.description || null,
      JSON.stringify(data.persona || { tone: 'professional', language: 'pt-BR' }),
    ]
  );
}

export async function updateAgent(
  id: string,
  organizationId: string,
  data: Partial<{
    name: string;
    description: string;
    avatar: string;
    persona: Agent['persona'];
    status: Agent['status'];
    config: Record<string, unknown>;
  }>
): Promise<Agent | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.avatar !== undefined) {
    fields.push(`avatar = $${paramIndex++}`);
    values.push(data.avatar);
  }
  if (data.persona !== undefined) {
    fields.push(`persona = $${paramIndex++}`);
    values.push(JSON.stringify(data.persona));
  }
  if (data.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.config !== undefined) {
    fields.push(`config = $${paramIndex++}`);
    values.push(JSON.stringify(data.config));
  }

  if (fields.length === 0) return getAgentById(id, organizationId);

  fields.push(`updated_at = NOW()`);
  values.push(id, organizationId);

  return queryOne<Agent>(
    `UPDATE agents SET ${fields.join(', ')} 
     WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
     RETURNING *`,
    values
  );
}

export async function deleteAgent(id: string, organizationId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM agents WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return result.rowCount ? result.rowCount > 0 : false;
}

export async function countAgentsByOrganization(organizationId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM agents WHERE organization_id = $1`,
    [organizationId]
  );
  return result ? parseInt(result.count, 10) : 0;
}

