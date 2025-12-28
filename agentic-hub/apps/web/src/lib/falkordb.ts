/**
 * FalkorDB Service - Graph Database Client
 * Uses Redis protocol with GRAPH commands (OpenCypher)
 */

import { createClient, RedisClientType } from 'redis';

// FalkorDB connection config
const FALKORDB_HOST = process.env.FALKORDB_HOST || 'localhost';
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT || '6380');

let client: RedisClientType | null = null;

async function getClient(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      socket: {
        host: FALKORDB_HOST,
        port: FALKORDB_PORT,
      },
    });
    
    client.on('error', (err) => console.error('FalkorDB Client Error:', err));
    await client.connect();
  }
  return client;
}

export interface GraphNode {
  id: string;
  label: string;
  name: string;
  properties?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  label?: string;
  weight?: number;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Parse FalkorDB result set
function parseResultSet(result: unknown[]): { columns: string[]; rows: unknown[][] } {
  if (!result || result.length < 2) return { columns: [], rows: [] };
  
  const columns = (result[0] as string[]) || [];
  const rows = (result[1] as unknown[][]) || [];
  
  return { columns, rows };
}

/**
 * Execute a Cypher query on the graph
 */
export async function query(graphName: string, cypherQuery: string, params?: Record<string, unknown>): Promise<unknown[][]> {
  const redis = await getClient();
  
  try {
    let command = ['GRAPH.QUERY', graphName, cypherQuery];
    
    if (params && Object.keys(params).length > 0) {
      const paramStr = JSON.stringify(params);
      command = ['GRAPH.QUERY', graphName, cypherQuery, '--', paramStr];
    }
    
    const result = await redis.sendCommand(command) as unknown[];
    const parsed = parseResultSet(result);
    return parsed.rows;
  } catch (error) {
    console.error('FalkorDB query error:', error);
    throw error;
  }
}

/**
 * Create a node in the graph
 */
export async function createNode(
  graphName: string,
  nodeId: string,
  label: string,
  properties: Record<string, unknown>
): Promise<boolean> {
  const propsStr = Object.entries({ ...properties, id: nodeId })
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ');
  
  const cypher = `CREATE (n:${label} {${propsStr}}) RETURN n`;
  
  try {
    await query(graphName, cypher);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a relationship between nodes
 */
export async function createEdge(
  graphName: string,
  sourceId: string,
  targetId: string,
  relationType: string,
  properties?: Record<string, unknown>
): Promise<boolean> {
  const propsStr = properties 
    ? ` {${Object.entries(properties).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}}`
    : '';
  
  const cypher = `
    MATCH (a {id: "${sourceId}"}), (b {id: "${targetId}"})
    CREATE (a)-[r:${relationType}${propsStr}]->(b)
    RETURN r
  `;
  
  try {
    await query(graphName, cypher);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all nodes and edges from a graph
 */
export async function getFullGraph(graphName: string): Promise<GraphQueryResult> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  try {
    // Get all nodes
    const nodeRows = await query(graphName, 'MATCH (n) RETURN n.id as id, labels(n)[0] as label, n.name as name, properties(n) as props');
    for (const row of nodeRows) {
      if (row[0]) {
        nodes.push({
          id: String(row[0]),
          label: String(row[1] || 'Entity'),
          name: String(row[2] || row[0]),
          properties: row[3] as Record<string, unknown>,
        });
      }
    }
    
    // Get all edges
    const edgeRows = await query(graphName, `
      MATCH (a)-[r]->(b) 
      RETURN a.id as source, b.id as target, type(r) as relation
    `);
    for (const row of edgeRows) {
      if (row[0] && row[1]) {
        edges.push({
          source: String(row[0]),
          target: String(row[1]),
          relation: String(row[2] || 'RELATES_TO'),
        });
      }
    }
  } catch (error) {
    console.error('Error getting full graph:', error);
  }
  
  return { nodes, edges };
}

/**
 * Delete a graph
 */
export async function deleteGraph(graphName: string): Promise<boolean> {
  const redis = await getClient();
  try {
    await redis.sendCommand(['GRAPH.DELETE', graphName]);
    return true;
  } catch {
    return false;
  }
}

