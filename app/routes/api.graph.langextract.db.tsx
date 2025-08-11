import 'dotenv/config';
import { json, type LoaderFunction } from "@remix-run/node";

// Returns the latest LangExtract-curated graph from Supabase tables where we store the graph JSON
// Table: public.langextract_graphs(id bigint pk, created_at timestamptz default now(), graph jsonb)

function supabaseHeaders() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } } as const;
}

export const loader: LoaderFunction = async () => {
  try {
    const { url, headers } = supabaseHeaders();
    // Fetch the most recent graph entry
    const res = await fetch(`${url}/rest/v1/langextract_graphs?select=graph,created_at&id=neq.0&order=created_at.desc&limit=1`, { headers });
    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Supabase read error ${res.status}: ${text}` }, { status: 502 });
    }
    const rows = await res.json();
    const graph = (rows && rows[0] && rows[0].graph) || { nodes: [], edges: [] };
    return json(graph, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
  } catch (err: any) {
    console.error('/api.graph.langextract.db error', err);
    return json({ error: 'Failed to read curated graph from Supabase' }, { status: 500 });
  }
};

