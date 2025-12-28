-- Agentic Hub - Messages and Channels Schema

-- ============================================
-- CHANNELS (WhatsApp, Website, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'website', 'email', 'slack', 'telegram', 'api')),
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  -- WhatsApp specific: instance_id, api_key, webhook_url
  -- Website: widget_id, allowed_origins
  credentials JSONB DEFAULT '{}',
  -- Encrypted in production
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- MESSAGES (separated from conversations for performance)
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  -- WhatsApp message ID, delivery status, etc.
  external_id TEXT,
  -- For tracking delivery status
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- WEBHOOK LOGS (for debugging integrations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  payload JSONB NOT NULL,
  response JSONB,
  status_code INT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_channels_organization ON public.channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON public.channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_agent ON public.channels(agent_id);
CREATE INDEX IF NOT EXISTS idx_channels_status ON public.channels(status);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON public.messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON public.messages(external_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_organization ON public.webhook_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_channel ON public.webhook_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- ============================================
-- UPDATE conversations table to link to channel
-- ============================================
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_channel_id ON public.conversations(channel_id);

