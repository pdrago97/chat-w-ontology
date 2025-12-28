/**
 * Agent Types - Tipos para agentes conversacionais
 */

export interface Agent {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  avatar?: string;
  persona: AgentPersona;
  knowledgeGraphId?: string;
  channels: AgentChannel[];
  status: AgentStatus;
  config: AgentConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPersona {
  tone: "formal" | "casual" | "friendly" | "professional";
  language: string;
  greeting?: string;
  fallbackMessage?: string;
  systemPrompt?: string;
}

export type AgentChannel = "website" | "whatsapp" | "email" | "slack" | "api";

export type AgentStatus = "draft" | "training" | "active" | "paused";

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  contextWindowSize?: number;
  useKnowledgeGraph?: boolean;
  handoffEnabled?: boolean;
  handoffThreshold?: number;
}

// Request/Response types para chat
export interface ChatRequest {
  message: string;
  channel: AgentChannel;
  sessionId?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  confidence: number;
  sources?: Array<{
    nodeId: string;
    label: string;
    relevance: number;
  }>;
  suggestedActions?: Array<{
    type: string;
    label: string;
    payload?: unknown;
  }>;
  handoffRequired?: boolean;
}

// Métricas do agente
export interface AgentMetrics {
  totalConversations: number;
  activeConversations: number;
  averageResponseTime: number;
  satisfactionScore?: number;
  handoffRate: number;
  topTopics: Array<{
    topic: string;
    count: number;
  }>;
}

