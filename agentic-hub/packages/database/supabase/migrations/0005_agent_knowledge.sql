-- Agent ↔ Knowledge Items (N:N) Association
-- Allows agents to access multiple knowledge items

-- ============================================
-- AGENT KNOWLEDGE ASSOCIATION
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'query' CHECK (access_type IN ('query', 'full')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(agent_id, knowledge_item_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent ON public.agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_item ON public.agent_knowledge(knowledge_item_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_enabled ON public.agent_knowledge(enabled) WHERE enabled = true;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.agent_knowledge IS 'N:N relationship between agents and knowledge items';
COMMENT ON COLUMN public.agent_knowledge.access_type IS 'query = agent can query/search; full = agent has full access to raw content';

