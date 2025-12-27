// Auto-generated from Cognee processing of resume.html
// Generated: 2025-12-17
// Source: tools/cognee_from_resume.py

import cogneeGraphJson from './cognee-graph.json';

export interface CogneeNode {
  id: string;
  label: string;
  type: string;
  category: string;
  description: string;
  data: Record<string, unknown>;
}

export interface CogneeEdge {
  source: string;
  target: string;
  label: string;
  type: string;
  data: Record<string, unknown>;
}

export interface CogneeGraphData {
  nodes: CogneeNode[];
  edges: CogneeEdge[];
  lastUpdated: string;
  source: string;
  resumePath: string;
  nodeCount: number;
  edgeCount: number;
}

export const cogneeGraphData: CogneeGraphData = cogneeGraphJson as CogneeGraphData;

export default cogneeGraphData;

