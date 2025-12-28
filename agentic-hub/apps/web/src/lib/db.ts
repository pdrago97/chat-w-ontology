import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agentic_hub',
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = getPool();
  return client.query<T>(text, params);
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

// User queries
export interface DbUser {
  id: string;
  organization_id: string;
  email: string;
  password_hash: string;
  profile: { name?: string;[key: string]: unknown };
  role: 'owner' | 'admin' | 'member';
  created_at: Date;
}

export interface DbOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByEmail(email: string): Promise<(DbUser & { org_slug: string; org_name: string }) | null> {
  return queryOne<DbUser & { org_slug: string; org_name: string }>(
    `SELECT u.*, o.slug as org_slug, o.name as org_name 
     FROM users u 
     JOIN organizations o ON u.organization_id = o.id 
     WHERE u.email = $1`,
    [email]
  );
}

export async function findUserById(id: string): Promise<(DbUser & { org_slug: string; org_name: string }) | null> {
  return queryOne<DbUser & { org_slug: string; org_name: string }>(
    `SELECT u.*, o.slug as org_slug, o.name as org_name 
     FROM users u 
     JOIN organizations o ON u.organization_id = o.id 
     WHERE u.id = $1`,
    [id]
  );
}

export async function createOrganization(name: string, slug: string): Promise<DbOrganization | null> {
  return queryOne<DbOrganization>(
    `INSERT INTO organizations (name, slug, plan) 
     VALUES ($1, $2, 'free') 
     RETURNING *`,
    [name, slug]
  );
}

export async function createUser(
  organizationId: string,
  email: string,
  passwordHash: string,
  name: string,
  role: 'owner' | 'admin' | 'member' = 'owner'
): Promise<DbUser | null> {
  return queryOne<DbUser>(
    `INSERT INTO users (organization_id, email, password_hash, profile, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [organizationId, email, passwordHash, JSON.stringify({ name }), role]
  );
}

export async function findOrganizationBySlug(slug: string): Promise<DbOrganization | null> {
  return queryOne<DbOrganization>(
    `SELECT * FROM organizations WHERE slug = $1`,
    [slug]
  );
}

