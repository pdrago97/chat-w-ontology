import { query, queryOne } from '../pg-client';
import type { UserProfile } from '../types';

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  organization_id: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  profile: UserProfile;
  created_at: Date;
}

export async function findUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
}

export async function findUsersByOrganization(organizationId: string): Promise<User[]> {
  return query<User>(
    'SELECT * FROM users WHERE organization_id = $1 ORDER BY created_at',
    [organizationId]
  );
}

export async function createUser(data: {
  email: string;
  password_hash?: string;
  organization_id?: string;
  role?: string;
  profile?: UserProfile;
}): Promise<User> {
  const result = await queryOne<User>(
    `INSERT INTO users (email, password_hash, organization_id, role, profile)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.email,
      data.password_hash || null,
      data.organization_id || null,
      data.role || 'member',
      JSON.stringify(data.profile || {})
    ]
  );
  return result!;
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, 'organization_id' | 'role' | 'profile'>>
): Promise<User | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.organization_id !== undefined) {
    updates.push(`organization_id = $${paramIndex++}`);
    values.push(data.organization_id);
  }
  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(data.role);
  }
  if (data.profile !== undefined) {
    updates.push(`profile = $${paramIndex++}`);
    values.push(JSON.stringify(data.profile));
  }

  if (updates.length === 0) return findUserById(id);

  values.push(id);

  return queryOne<User>(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
}

