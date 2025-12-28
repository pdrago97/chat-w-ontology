/**
 * Integrations Service
 * Manages external data sources (Airweave, APIs, Databases)
 */

import { query, queryOne } from './db';

export interface IntegrationSource {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  source_type: 'airweave' | 'api' | 'database' | 'webhook';
  provider: string | null;
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  sync_enabled: boolean;
  sync_frequency: string;
  last_sync_at: Date | null;
  next_sync_at: Date | null;
  status: 'pending' | 'connected' | 'syncing' | 'error' | 'disabled';
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IntegrationJob {
  id: string;
  integration_id: string;
  job_type: string;
  status: string;
  total_items: number;
  processed_items: number;
  failed_items: number;
  result: Record<string, unknown>;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

// Available providers for Airweave integration
export const AIRWEAVE_PROVIDERS = [
  { id: 'notion', name: 'Notion', icon: '📝', category: 'productivity' },
  { id: 'google_drive', name: 'Google Drive', icon: '📁', category: 'storage' },
  { id: 'google_docs', name: 'Google Docs', icon: '📄', category: 'productivity' },
  { id: 'slack', name: 'Slack', icon: '💬', category: 'communication' },
  { id: 'confluence', name: 'Confluence', icon: '📚', category: 'documentation' },
  { id: 'jira', name: 'Jira', icon: '🎫', category: 'project_management' },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️', category: 'crm' },
  { id: 'hubspot', name: 'HubSpot', icon: '🧲', category: 'crm' },
  { id: 'postgresql', name: 'PostgreSQL', icon: '🐘', category: 'database' },
  { id: 'mysql', name: 'MySQL', icon: '🐬', category: 'database' },
  { id: 'mongodb', name: 'MongoDB', icon: '🍃', category: 'database' },
  { id: 'airtable', name: 'Airtable', icon: '📊', category: 'database' },
  { id: 'zendesk', name: 'Zendesk', icon: '🎧', category: 'support' },
  { id: 'intercom', name: 'Intercom', icon: '💭', category: 'support' },
  { id: 'github', name: 'GitHub', icon: '🐙', category: 'development' },
  { id: 'gitlab', name: 'GitLab', icon: '🦊', category: 'development' },
];

// CRUD Operations
export async function getIntegrationsByOrganization(organizationId: string): Promise<IntegrationSource[]> {
  const result = await query<IntegrationSource>(
    `SELECT * FROM integration_sources WHERE organization_id = $1 ORDER BY created_at DESC`,
    [organizationId]
  );
  return result.rows;
}

export async function getIntegrationById(id: string, organizationId: string): Promise<IntegrationSource | null> {
  return queryOne<IntegrationSource>(
    `SELECT * FROM integration_sources WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
}

export async function createIntegration(data: {
  organizationId: string;
  name: string;
  description?: string;
  sourceType: IntegrationSource['source_type'];
  provider?: string;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  syncFrequency?: string;
  createdBy?: string;
}): Promise<IntegrationSource | null> {
  return queryOne<IntegrationSource>(
    `INSERT INTO integration_sources 
     (organization_id, name, description, source_type, provider, config, credentials, sync_frequency, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.organizationId,
      data.name,
      data.description || null,
      data.sourceType,
      data.provider || null,
      JSON.stringify(data.config || {}),
      JSON.stringify(data.credentials || {}),
      data.syncFrequency || 'daily',
      data.createdBy || null,
    ]
  );
}

export async function updateIntegrationStatus(
  id: string,
  status: IntegrationSource['status'],
  errorMessage?: string
): Promise<IntegrationSource | null> {
  return queryOne<IntegrationSource>(
    `UPDATE integration_sources 
     SET status = $1, error_message = $2, updated_at = NOW() 
     WHERE id = $3 RETURNING *`,
    [status, errorMessage || null, id]
  );
}

export async function deleteIntegration(id: string, organizationId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM integration_sources WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return result.rowCount ? result.rowCount > 0 : false;
}

// Job operations
export async function createIntegrationJob(integrationId: string, jobType = 'sync'): Promise<IntegrationJob | null> {
  return queryOne<IntegrationJob>(
    `INSERT INTO integration_jobs (integration_id, job_type, status, started_at)
     VALUES ($1, $2, 'running', NOW())
     RETURNING *`,
    [integrationId, jobType]
  );
}

export async function updateJobProgress(
  jobId: string,
  processed: number,
  total: number,
  failed = 0
): Promise<void> {
  await query(
    `UPDATE integration_jobs 
     SET processed_items = $1, total_items = $2, failed_items = $3
     WHERE id = $4`,
    [processed, total, failed, jobId]
  );
}

export async function completeJob(
  jobId: string,
  status: 'completed' | 'failed',
  result?: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  await query(
    `UPDATE integration_jobs 
     SET status = $1, result = $2, error_message = $3, completed_at = NOW()
     WHERE id = $4`,
    [status, JSON.stringify(result || {}), errorMessage || null, jobId]
  );
}

