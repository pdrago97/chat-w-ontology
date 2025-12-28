-- Knowledge Base Schema
-- Stores knowledge items, embeddings, and graph metadata

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge Items - source documents/content
CREATE TABLE IF NOT EXISTS public.knowledge_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    
    -- Content info
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'document', 'url', 'prompt', 'instruction', 'tool')),
    source_url TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size INTEGER,
    file_data BYTEA, -- Binary file data for reprocessing
    
    -- Processing status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'failed')),
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    indexed_at TIMESTAMPTZ
);

-- Knowledge Chunks - split content for embedding
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_item_id UUID NOT NULL REFERENCES public.knowledge_items(id) ON DELETE CASCADE,
    
    -- Chunk content
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    
    -- Embedding (1536 dimensions for OpenAI ada-002)
    embedding vector(1536),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    token_count INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Graph Nodes - stored in PostgreSQL for persistence, synced to FalkorDB
CREATE TABLE IF NOT EXISTS public.graph_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Node identity
    node_id TEXT NOT NULL, -- External ID used in FalkorDB
    label TEXT NOT NULL,   -- Node type (Entity, Concept, Person, etc.)
    
    -- Node data
    name TEXT NOT NULL,
    description TEXT,
    properties JSONB DEFAULT '{}',
    
    -- Source linking
    knowledge_item_id UUID REFERENCES public.knowledge_items(id) ON DELETE SET NULL,
    
    -- Embedding for semantic search
    embedding vector(1536),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, node_id)
);

-- Graph Edges - relationships between nodes
CREATE TABLE IF NOT EXISTS public.graph_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Edge connections
    source_node_id UUID NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
    
    -- Relationship info
    relation_type TEXT NOT NULL, -- e.g., "WORKS_AT", "KNOWS", "RELATES_TO"
    label TEXT,                  -- Human readable label
    weight REAL DEFAULT 1.0,
    
    -- Properties
    properties JSONB DEFAULT '{}',
    
    -- Source linking
    knowledge_item_id UUID REFERENCES public.knowledge_items(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, source_node_id, target_node_id, relation_type)
);

-- Agent Knowledge Links - which knowledge items are assigned to which agents
CREATE TABLE IF NOT EXISTS public.agent_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    knowledge_item_id UUID NOT NULL REFERENCES public.knowledge_items(id) ON DELETE CASCADE,
    
    -- Priority/weight for this agent
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agent_id, knowledge_item_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_items_org ON public.knowledge_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_agent ON public.knowledge_items(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_status ON public.knowledge_items(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_type ON public.knowledge_items(content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_tags ON public.knowledge_items USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_item ON public.knowledge_chunks(knowledge_item_id);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_org ON public.graph_nodes(organization_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_label ON public.graph_nodes(organization_id, label);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_name ON public.graph_nodes(organization_id, name);

CREATE INDEX IF NOT EXISTS idx_graph_edges_org ON public.graph_edges(organization_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON public.graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON public.graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relation ON public.graph_edges(relation_type);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent ON public.agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_item ON public.agent_knowledge(knowledge_item_id);

-- Vector similarity search indexes (using ivfflat for performance)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON public.knowledge_chunks 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    
CREATE INDEX IF NOT EXISTS idx_graph_nodes_embedding ON public.graph_nodes 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge ENABLE ROW LEVEL SECURITY;

