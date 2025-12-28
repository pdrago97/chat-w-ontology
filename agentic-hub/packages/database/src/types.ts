/**
 * Database Types - Complementary types for database operations
 * These extend the auto-generated types from Supabase
 */

// Graph data structure stored in JSONB
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  description?: string;
  category?: string;
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  label?: string;
  weight?: number;
  data?: Record<string, unknown>;
}

// Agent persona stored in JSONB
export interface AgentPersona {
  tone: "formal" | "casual" | "friendly" | "professional";
  language: string;
  greeting?: string;
  fallbackMessage?: string;
  systemPrompt?: string;
}

// Agent config stored in JSONB
export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  contextWindowSize?: number;
  useKnowledgeGraph?: boolean;
  handoffEnabled?: boolean;
  handoffThreshold?: number;
}

// Conversation message structure
export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Customer data stored in conversations
export interface CustomerData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

// Organization settings stored in JSONB
export interface OrganizationSettings {
  branding?: {
    logo?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  limits?: {
    maxAgents: number;
    maxConversationsPerMonth: number;
    maxStorageGB: number;
  };
  features?: {
    whatsappEnabled: boolean;
    apiAccessEnabled: boolean;
    customIntegrations: boolean;
  };
}

// User profile stored in JSONB
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
}

