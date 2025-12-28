import { query, queryOne } from '../pg-client';
import type { OrganizationSettings } from '../types';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  settings: OrganizationSettings;
  created_at: Date;
  updated_at: Date;
}

export async function findOrganizationById(id: string): Promise<Organization | null> {
  return queryOne<Organization>(
    'SELECT * FROM organizations WHERE id = $1',
    [id]
  );
}

export async function findOrganizationBySlug(slug: string): Promise<Organization | null> {
  return queryOne<Organization>(
    'SELECT * FROM organizations WHERE slug = $1',
    [slug]
  );
}

export async function listOrganizations(): Promise<Organization[]> {
  return query<Organization>(
    'SELECT * FROM organizations ORDER BY created_at DESC'
  );
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  plan?: string;
  settings?: OrganizationSettings;
}): Promise<Organization> {
  const result = await queryOne<Organization>(
    `INSERT INTO organizations (name, slug, plan, settings)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.slug, data.plan || 'starter', JSON.stringify(data.settings || {})]
  );
  return result!;
}

export async function updateOrganization(
  id: string,
  data: Partial<Pick<Organization, 'name' | 'plan' | 'settings'>>
): Promise<Organization | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.plan !== undefined) {
    updates.push(`plan = $${paramIndex++}`);
    values.push(data.plan);
  }
  if (data.settings !== undefined) {
    updates.push(`settings = $${paramIndex++}`);
    values.push(JSON.stringify(data.settings));
  }

  if (updates.length === 0) return findOrganizationById(id);

  updates.push(`updated_at = NOW()`);
  values.push(id);

  return queryOne<Organization>(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
}

