import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";

// Graph-Builder Chat endpoint: asks questions and proposes graph deltas
// Returns JSON: { assistant_message?, follow_up_questions?, proposed_changes? }

interface GraphChangeNewNode { type: 'new_node'; data: { id: string; label?: string; type?: string; [k: string]: any } }
interface GraphChangeUpdateNode { type: 'update_node'; node_id: string; updates: { [k: string]: any } }
interface GraphChangeNewEdge { type: 'new_edge'; data: { source: string; target: string; relation?: string; [k: string]: any } }
export type GraphChange = GraphChangeNewNode | GraphChangeUpdateNode | GraphChangeNewEdge;

interface ChatRequest {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  graphData: { nodes: any[]; edges: any[] };
  language?: string;
}

function summarizeGraph(graph: { nodes?: any[]; edges?: any[] }) {
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const typeCounts = nodes.reduce((acc: Record<string, number>, n: any) => {
    const t = String(n.type || 'Unknown');
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const topTypes = Object.entries(typeCounts).map(([t, c]) => `${t}:${c}`).slice(0, 12).join(', ');
  return `Nodes:${nodes.length} Edges:${edges.length} Types:[${topTypes}]`;
}

export const action: ActionFunction = async ({ request }) => {
  try {
    const { message, history = [], graphData, language = 'en' } = (await request.json()) as ChatRequest;

    if (!process.env.OPENAI_API_KEY) {
      return json({ error: 'OPENAI_API_KEY missing' }, { status: 500 });
    }

    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const graphSummary = summarizeGraph(graphData || { nodes: [], edges: [] });

    const system = `You are a Graph-Builder agent for Pedro's curriculum/projects.\n
Your goals:\n- Ask targeted follow-up questions when information is missing.\n- Propose atomic graph changes to improve the knowledge graph.\n- Prefer small batches (max 5 changes).\n- Keep IDs stable and human-readable.\n- Use types like Person, Education, Experience, Project, Skill, Group, Status.\n- Edges use relation like 'worked_with', 'studied_at', 'member_of', etc.\n
When proposing changes, RETURN STRICT JSON with the key 'proposed_changes' containing an array of change objects matching this schema:\n- {"type":"new_node","data":{id,label,type,...}}\n- {"type":"update_node","node_id":"ID","updates":{...}}\n- {"type":"new_edge","data":{source,target,relation,...}}\n
If you need more info, return {"follow_up_questions":["...","..."]}.\nAlways include an 'assistant_message' explaining the rationale in plain text.`;

    const user = `Language: ${language}\nGraph summary: ${graphSummary}\nUser: ${message}`;

    const msgs = [
      { role: 'system' as const, content: system },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: user }
    ];

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 700,
      messages: msgs
    });

    const content = completion.choices[0]?.message?.content || '';

    // Try to parse strict JSON; if not, fall back to assistant_message only
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      // try to extract JSON block inside markdown
      const m = content.match(/\{[\s\S]*\}$/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch {}
      }
    }

    if (parsed && (parsed.proposed_changes || parsed.follow_up_questions || parsed.assistant_message)) {
      return json({
        assistant_message: parsed.assistant_message || '',
        follow_up_questions: parsed.follow_up_questions || undefined,
        proposed_changes: parsed.proposed_changes || undefined
      });
    }

    // default
    return json({ assistant_message: content });
  } catch (err) {
    console.error('api.graph_builder.chat error', err);
    return json({ error: 'Graph-Builder chat failed' }, { status: 500 });
  }
};

export default function Route() { return null as any; }

