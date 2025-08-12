import 'dotenv/config';
import { json, type LoaderFunction } from "@remix-run/node";

// Returns the Cognee refined graph straight from Supabase tables
// Tables:
//  - public.cognee_nodes_public(node_id, label, type, props)
//  - public.cognee_edges_public(source, target, kind, weight, props)

function supabaseHeaders() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } } as const;
}

export const loader: LoaderFunction = async ({ request }) => {
  try {
    // In production, return empty graph if Cognee tables don't exist
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      return json({
        nodes: [],
        edges: [],
        lastUpdated: new Date().toISOString(),
        _info: "Cognee service not available in production"
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(5000, Number(searchParams.get("limit") || 2000)));

    const { url, headers } = supabaseHeaders();

    const nodesRes = await fetch(`${url}/rest/v1/cognee_nodes_public?select=node_id,label,type,props&limit=${limit}`, { headers });
    if (!nodesRes.ok) {
      const text = await nodesRes.text();
      return json({ error: `Supabase nodes error ${nodesRes.status}: ${text}` }, { status: 502 });
    }
    const nodesRows = await nodesRes.json();

    const edgesRes = await fetch(`${url}/rest/v1/cognee_edges_public?select=source,target,kind,weight,props&limit=${limit}`, { headers });
    if (!edgesRes.ok) {
      const text = await edgesRes.text();
      return json({ error: `Supabase edges error ${edgesRes.status}: ${text}` }, { status: 502 });
    }
    const edgesRows = await edgesRes.json();

    const nodes = nodesRows.map((n: any) => ({
      id: String(n.node_id),
      label: String(n.label || n.node_id),
      type: String(n.type || 'Node'),
      data: n.props || {}
    }));

    const edges = edgesRows.map((e: any, idx: number) => ({
      id: `${e.source}-${e.target}-${e.kind}-${idx}`,
      source: String(e.source),
      target: String(e.target),
      relation: String(e.kind || ''),
      weight: typeof e.weight === 'number' ? e.weight : 1,
      data: e.props || {}
    }));

    return json({ nodes, edges, lastUpdated: new Date().toISOString() }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    console.error("/api.graph.cognee error:", err);
    return json({ error: "Failed to fetch Cognee graph from Supabase" }, { status: 500 });
  }
};

