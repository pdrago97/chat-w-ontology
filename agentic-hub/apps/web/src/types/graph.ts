/**
 * Knowledge Graph Types - Herança do chat-w-ontology
 * Estrutura de dados para grafos de conhecimento
 */

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

export interface KnowledgeGraph {
  id: string;
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  source?: "manual" | "cognee" | "import";
  meta?: Record<string, unknown>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Node types comuns
export type NodeType =
  | "Person"
  | "Organization"
  | "Experience"
  | "Education"
  | "Skill"
  | "Project"
  | "Certification"
  | "Topic"
  | "Product"
  | "Service"
  | "Customer"
  | "Conversation"
  | "Custom";

// Cores por tipo de nó (para visualização)
export const NODE_COLORS: Record<string, string> = {
  Person: "#3b82f6",       // blue
  Organization: "#8b5cf6", // purple
  Experience: "#10b981",   // green
  Education: "#f59e0b",    // amber
  Skill: "#ec4899",        // pink
  Project: "#06b6d4",      // cyan
  Certification: "#f97316", // orange
  Topic: "#84cc16",        // lime
  Product: "#14b8a6",      // teal
  Service: "#a855f7",      // violet
  Customer: "#0ea5e9",     // sky
  Conversation: "#64748b", // slate
  Custom: "#6b7280",       // gray
};

// Tamanhos por tipo de nó
export const NODE_SIZES: Record<string, number> = {
  Person: 8,
  Organization: 10,
  Experience: 6,
  Education: 6,
  Skill: 4,
  Project: 7,
  Certification: 5,
  Topic: 5,
  Product: 7,
  Service: 7,
  Customer: 6,
  Conversation: 4,
  Custom: 5,
};

