import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Database client configuration
 * - Local dev: Uses PostgreSQL directly via DATABASE_URL
 * - Production: Uses Supabase client
 */

export function isLocalDev(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NODE_ENV === 'development' &&
    !!process.env.DATABASE_URL;
}

// Get database connection URL for direct PostgreSQL access
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/agentic_hub';
}

// Client-side Supabase client (uses anon key) - Production only
export function createBrowserClient() {
  if (isLocalDev()) {
    console.warn('Browser client not available in local dev mode');
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Server-side Supabase client (uses service role key) - Production only
export function createServerClient() {
  if (isLocalDev()) {
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type SupabaseClient = ReturnType<typeof createBrowserClient>;
export type SupabaseServerClient = ReturnType<typeof createServerClient>;

