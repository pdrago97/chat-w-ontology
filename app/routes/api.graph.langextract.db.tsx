import 'dotenv/config';
import { json, type LoaderFunction } from "@remix-run/node";

// Returns the latest LangExtract-curated graph from Supabase tables where we store the graph JSON
// Table: public.langextract_graphs(id bigint pk, created_at timestamptz default now(), graph jsonb)
// Falls back to static knowledge graph when Supabase is unavailable

function supabaseHeaders() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } } as const;
}

// Load the full knowledge graph JSON as fallback
async function loadFallbackGraph() {
  try {
    const [{ default: fs }, { default: path }] = await Promise.all([
      import("fs/promises"),
      import("path"),
    ]);
    const filePath = path.join(process.cwd(), "public", "knowledge-graph.json");
    const fileContents = await fs.readFile(filePath, "utf-8");
    const graph = JSON.parse(fileContents);
    return { ...graph, isFallback: true, lastUpdated: new Date().toISOString() };
  } catch (error) {
    console.error("Failed to load knowledge-graph.json:", error);
    return { nodes: [], edges: [], isFallback: true, error: 'Failed to load fallback graph' };
  }
}

export const loader: LoaderFunction = async () => {
  try {
    const supabase = supabaseHeaders();

    // If Supabase not configured, use fallback
    if (!supabase) {
      console.warn('/api.graph.langextract.db: Supabase not configured, using static fallback');
      return json(await loadFallbackGraph(), {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    }

    const { url, headers } = supabase;
    // Fetch the most recent graph entry
    const res = await fetch(`${url}/rest/v1/langextract_graphs?select=graph,created_at&id=neq.0&order=created_at.desc&limit=1`, { headers });
    if (!res.ok) {
      console.warn('/api.graph.langextract.db: Supabase error, using static fallback');
      return json(await loadFallbackGraph(), {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
    }
    const rows = await res.json();
    const graph = (rows && rows[0] && rows[0].graph) || await loadFallbackGraph();
    return json(graph, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
  } catch (err: any) {
    console.error('/api.graph.langextract.db error', err);
    // Return fallback instead of error
    return json(await loadFallbackGraph(), {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  }
};

