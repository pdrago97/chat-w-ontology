/**
 * Knowledge Base Service
 * Manages knowledge items, chunks, and graph nodes
 */

import { query, queryOne } from './db';

export interface KnowledgeItem {
  id: string;
  organization_id: string;
  agent_id: string | null;
  title: string;
  content: string;
  content_type: 'text' | 'document' | 'url' | 'prompt' | 'instruction' | 'tool';
  source_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  error_message: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  indexed_at: Date | null;
}

export interface GraphNode {
  id: string;
  organization_id: string;
  node_id: string;
  label: string;
  name: string;
  description: string | null;
  properties: Record<string, unknown>;
  knowledge_item_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface GraphEdge {
  id: string;
  organization_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  label: string | null;
  weight: number;
  properties: Record<string, unknown>;
  knowledge_item_id: string | null;
  created_at: Date;
}

// Knowledge Items CRUD
export async function getKnowledgeItemsByOrganization(
  organizationId: string,
  options?: { type?: string; status?: string; agentId?: string }
): Promise<KnowledgeItem[]> {
  // Exclude file_data (BYTEA) from listing to avoid serialization issues
  let sql = `SELECT id, organization_id, agent_id, title, content, content_type, source_url,
    file_name, file_type, file_size, status, error_message, metadata, tags,
    created_at, updated_at, indexed_at, graph_data FROM knowledge_items WHERE organization_id = $1`;
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (options?.type) {
    sql += ` AND content_type = $${idx++}`;
    params.push(options.type);
  }
  if (options?.status) {
    sql += ` AND status = $${idx++}`;
    params.push(options.status);
  }
  if (options?.agentId) {
    sql += ` AND agent_id = $${idx++}`;
    params.push(options.agentId);
  }

  sql += ` ORDER BY created_at DESC`;
  const result = await query<KnowledgeItem>(sql, params);
  return result.rows;
}

export async function getKnowledgeItemById(id: string, organizationId: string): Promise<KnowledgeItem | null> {
  return queryOne<KnowledgeItem>(
    `SELECT * FROM knowledge_items WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
}

export async function createKnowledgeItem(data: {
  organizationId: string;
  title: string;
  content: string;
  contentType: KnowledgeItem['content_type'];
  agentId?: string;
  sourceUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileData?: Buffer;
  metadata?: Record<string, unknown>;
  tags?: string[];
}): Promise<KnowledgeItem | null> {
  return queryOne<KnowledgeItem>(
    `INSERT INTO knowledge_items
     (organization_id, title, content, content_type, agent_id, source_url, file_name, file_type, file_size, file_data, metadata, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.organizationId,
      data.title,
      data.content,
      data.contentType,
      data.agentId || null,
      data.sourceUrl || null,
      data.fileName || null,
      data.fileType || null,
      data.fileSize || null,
      data.fileData || null,
      JSON.stringify(data.metadata || {}),
      data.tags || [],
    ]
  );
}

export async function updateKnowledgeItemStatus(
  id: string,
  status: KnowledgeItem['status'],
  errorMessage?: string
): Promise<KnowledgeItem | null> {
  const indexedAt = status === 'indexed' ? 'NOW()' : 'NULL';
  return queryOne<KnowledgeItem>(
    `UPDATE knowledge_items 
     SET status = $1, error_message = $2, indexed_at = ${indexedAt}, updated_at = NOW() 
     WHERE id = $3 RETURNING *`,
    [status, errorMessage || null, id]
  );
}

export async function deleteKnowledgeItem(id: string, organizationId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM knowledge_items WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return result.rowCount ? result.rowCount > 0 : false;
}

// Graph Nodes CRUD
export async function getGraphNodesByOrganization(organizationId: string): Promise<GraphNode[]> {
  const result = await query<GraphNode>(
    `SELECT gn.id, gn.graph_id, gn.node_id, gn.type as label, gn.label as name,
            gn.properties, gn.created_at, kg.organization_id
     FROM graph_nodes gn
     JOIN knowledge_graphs kg ON gn.graph_id = kg.id
     WHERE kg.organization_id = $1
     ORDER BY gn.created_at DESC`,
    [organizationId]
  );
  return result.rows;
}

// Get or create default graph for organization
async function getOrCreateDefaultGraph(organizationId: string): Promise<string> {
  // Try to find existing default graph
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM knowledge_graphs WHERE organization_id = $1 AND name = 'Default' LIMIT 1`,
    [organizationId]
  );

  if (existing) return existing.id;

  // Create default graph
  const created = await queryOne<{ id: string }>(
    `INSERT INTO knowledge_graphs (organization_id, name, source) VALUES ($1, 'Default', 'manual') RETURNING id`,
    [organizationId]
  );

  return created!.id;
}

export async function createGraphNode(data: {
  organizationId: string;
  nodeId: string;
  label: string;
  name: string;
  description?: string;
  properties?: Record<string, unknown>;
  knowledgeItemId?: string;
}): Promise<GraphNode | null> {
  // Get or create default graph for this organization
  const graphId = await getOrCreateDefaultGraph(data.organizationId);

  return queryOne<GraphNode>(
    `INSERT INTO graph_nodes
     (graph_id, node_id, type, label, properties)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *, $6::uuid as organization_id`,
    [
      graphId,
      data.nodeId,
      data.label,
      data.name,
      JSON.stringify({ ...data.properties, description: data.description }),
      data.organizationId,
    ]
  );
}

