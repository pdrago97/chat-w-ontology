import { query, queryOne } from '../pg-client';
import type { AgentPersona, AgentConfig } from '../types';

export interface Agent {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  persona: AgentPersona;
  knowledge_graph_id: string | null;
  channels: string[];
  status: 'draft' | 'training' | 'active' | 'paused';
  config: AgentConfig;
  created_at: Date;
  updated_at: Date;
}

export async function findAgentById(id: string): Promise<Agent | null> {
  return queryOne<Agent>(
    'SELECT * FROM agents WHERE id = $1',
    [id]
  );
}

export async function findAgentsByOrganization(organizationId: string): Promise<Agent[]> {
  return query<Agent>(
    'SELECT * FROM agents WHERE organization_id = $1 ORDER BY created_at DESC',
    [organizationId]
  );
}

export async function createAgent(data: {
  organization_id: string;
  name: string;
  description?: string;
  persona?: AgentPersona;
  channels?: string[];
  config?: AgentConfig;
}): Promise<Agent> {
  const result = await queryOne<Agent>(
    `INSERT INTO agents (organization_id, name, description, persona, channels, config)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.organization_id,
      data.name,
      data.description || null,
      JSON.stringify(data.persona || { tone: 'professional', language: 'pt-BR' }),
      JSON.stringify(data.channels || []),
      JSON.stringify(data.config || {})
    ]
  );
  return result!;
}

export async function updateAgent(
  id: string,
  data: Partial<Omit<Agent, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<Agent | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fields = ['name', 'description', 'avatar', 'persona', 'knowledge_graph_id', 'channels', 'status', 'config'];
  
  for (const field of fields) {
    if ((data as Record<string, unknown>)[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      const value = (data as Record<string, unknown>)[field];
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }
  }

  if (updates.length === 0) return findAgentById(id);

  updates.push(`updated_at = NOW()`);
  values.push(id);

  return queryOne<Agent>(
    `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
}

export async function deleteAgent(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM agents WHERE id = $1 RETURNING id',
    [id]
  );
  return result.length > 0;
}

