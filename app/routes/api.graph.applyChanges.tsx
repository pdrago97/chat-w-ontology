import { json } from "@remix-run/cloudflare";
import type { ActionFunction } from "@remix-run/cloudflare";
import fs from 'fs/promises';
import path from 'path';

// Applies accepted changes to the canonical curated graph JSON
// Local/admin use. Validates minimal shape and merges safely.

interface ChangeNewNode { type: 'new_node'; data: any }
interface ChangeUpdateNode { type: 'update_node'; node_id: string; updates: any }
interface ChangeNewEdge { type: 'new_edge'; data: any }

type Change = ChangeNewNode | ChangeUpdateNode | ChangeNewEdge;

function applyChanges(graph: any, changes: Change[]) {
  const nodes: any[] = Array.isArray(graph.nodes) ? graph.nodes : (graph.nodes = []);
  const edges: any[] = Array.isArray(graph.edges) ? graph.edges : (graph.edges = []);
  const byId = new Map(nodes.map(n => [String(n.id), n]));

  for (const ch of changes) {
    if (ch.type === 'new_node' && ch.data && ch.data.id) {
      const id = String(ch.data.id);
      if (!byId.has(id)) {
        const nn = { id, label: ch.data.label || id, type: ch.data.type || 'Unknown', ...ch.data };
        nodes.push(nn); byId.set(id, nn);
      }
    } else if (ch.type === 'update_node' && ch.node_id && ch.updates) {
      const id = String(ch.node_id);
      const n = byId.get(id);
      if (n) Object.assign(n, ch.updates);
    } else if (ch.type === 'new_edge' && ch.data && ch.data.source && ch.data.target) {
      const e = { id: ch.data.id || `${ch.data.source}-${ch.data.target}-${Date.now()}`,
        source: String(ch.data.source), target: String(ch.data.target), relation: ch.data.relation || '', ...ch.data };
      edges.push(e);
    }
  }
  return graph;
}

export const action: ActionFunction = async ({ request }) => {
  try {
    const { changes } = await request.json();
    if (!Array.isArray(changes) || changes.length === 0) return json({ error: 'No changes' }, { status: 400 });

    const filePath = path.join(process.cwd(), 'public', 'knowledge-graph.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const graph = JSON.parse(raw);

    const updated = applyChanges(graph, changes);
    updated.lastUpdated = new Date().toISOString();

    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');

    return json({ ok: true, graph: updated });
  } catch (err) {
    console.error('applyChanges error', err);
    return json({ error: 'Failed to apply changes' }, { status: 500 });
  }
};

export default function Route() { return null as any; }

