-- Integrations: External data sources (Airweave, APIs, Databases)

-- Integration Sources table
CREATE TABLE IF NOT EXISTS public.integration_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Source info
    name TEXT NOT NULL,
    description TEXT,
    source_type TEXT NOT NULL, -- 'airweave', 'api', 'database', 'webhook'
    provider TEXT, -- 'notion', 'slack', 'google_drive', 'postgresql', 'salesforce', etc.
    
    -- Configuration (encrypted in production)
    config JSONB DEFAULT '{}',
    credentials JSONB DEFAULT '{}', -- API keys, tokens, etc.
    
    -- Sync settings
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency TEXT DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly', 'manual'
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'syncing', 'error', 'disabled')),
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

-- Integration Sync Jobs
CREATE TABLE IF NOT EXISTS public.integration_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES public.integration_sources(id) ON DELETE CASCADE,
    
    -- Job info
    job_type TEXT NOT NULL DEFAULT 'sync', -- 'sync', 'full_sync', 'test'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Progress
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Results
    result JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration Items (synced data)
CREATE TABLE IF NOT EXISTS public.integration_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES public.integration_sources(id) ON DELETE CASCADE,
    knowledge_item_id UUID REFERENCES public.knowledge_items(id) ON DELETE SET NULL,
    
    -- External reference
    external_id TEXT NOT NULL,
    external_url TEXT,
    
    -- Content
    title TEXT NOT NULL,
    content TEXT,
    content_type TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Sync info
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    external_updated_at TIMESTAMPTZ,
    
    -- Unique constraint per integration
    UNIQUE(integration_id, external_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_sources_org ON public.integration_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_sources_status ON public.integration_sources(status);
CREATE INDEX IF NOT EXISTS idx_integration_jobs_integration ON public.integration_jobs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_jobs_status ON public.integration_jobs(status);
CREATE INDEX IF NOT EXISTS idx_integration_items_integration ON public.integration_items(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_items_external ON public.integration_items(integration_id, external_id);

-- RLS Policies
ALTER TABLE public.integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_items ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_integration_sources_updated_at
    BEFORE UPDATE ON public.integration_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

