-- Agentic Hub - Initial Schema
-- Multi-tenant platform for AI agents with Knowledge Graphs

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- ORGANIZATIONS (Tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USERS (standalone for local dev, links to auth.users in Supabase prod)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- Only for local dev, Supabase handles auth in prod
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- AGENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  persona JSONB DEFAULT '{"tone": "professional", "language": "pt-BR"}',
  knowledge_graph_id UUID,
  channels JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'training', 'active', 'paused')),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- KNOWLEDGE GRAPHS
-- ============================================
CREATE TABLE IF NOT EXISTS public.knowledge_graphs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  graph JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  source TEXT CHECK (source IN ('manual', 'cognee', 'import')),
  meta JSONB,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key from agents to knowledge_graphs
ALTER TABLE public.agents 
  ADD CONSTRAINT fk_agents_knowledge_graph 
  FOREIGN KEY (knowledge_graph_id) 
  REFERENCES knowledge_graphs(id) 
  ON DELETE SET NULL;

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('website', 'whatsapp', 'email', 'slack', 'api')),
  external_id TEXT,
  customer JSONB DEFAULT '{}',
  messages JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'handoff')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ============================================
-- GRAPH NODES (for vector search)
-- ============================================
CREATE TABLE IF NOT EXISTS public.graph_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  graph_id UUID NOT NULL REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT,
  properties JSONB,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_users_organization ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_organization ON public.agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON public.agents(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_graphs_organization ON public.knowledge_graphs(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_graphs_agent ON public.knowledge_graphs(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON public.conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON public.conversations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_graph ON public.graph_nodes(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON public.graph_nodes(type);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_graph_nodes_embedding ON public.graph_nodes 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- ROW LEVEL SECURITY (Supabase production only)
-- ============================================
-- Note: RLS policies using auth.uid() are defined in a separate
-- migration file for Supabase production environment.
-- Local development runs without RLS for simplicity.

-- ============================================
-- SEED DATA FOR DEVELOPMENT
-- ============================================
-- Create a default organization and admin user for local development
INSERT INTO public.organizations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Organization', 'dev-org', 'enterprise')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.users (id, email, organization_id, role, profile)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@dev.local',
  '00000000-0000-0000-0000-000000000001',
  'owner',
  '{"firstName": "Admin", "lastName": "Dev"}'
)
ON CONFLICT (email) DO NOTHING;

