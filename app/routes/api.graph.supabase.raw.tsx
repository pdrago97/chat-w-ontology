import 'dotenv/config';
import { json, type LoaderFunction } from "@remix-run/cloudflare";

// Builds a lightweight graph from the public.documents table (doc-level nodes only)
// Safe-by-default: no client credentials; server reads from Supabase REST using service key

function supabaseHeaders() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } } as const;
}

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(1000, Number(searchParams.get("limit") || 400)));

    const { url, headers } = supabaseHeaders();

    // fetch minimal fields; assume metadata may contain title/source/doc_id
    const endpoint = `${url}/rest/v1/documents?select=id,content,metadata&limit=${limit}`;
    const res = await fetch(endpoint, { headers });
    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Supabase documents error ${res.status}: ${text}` }, { status: 502 });
    }

    const rows = await res.json();

    // Build nodes (no similarity edges by default for speed/safety)
    const nodes = rows.map((r: any) => {
      const md = r.metadata || {};
      const title = md.title || md.name || md.file_name || md.url || (r.content ? String(r.content).slice(0, 80) + "…" : `doc ${r.id}`);
      return {
        id: String(r.id),
        label: String(title),
        type: "Document",
        data: { metadata: md }
      };
    });

    // Optionally add containment edges if a doc_id grouping exists; skipped for minimal case
    const edges: any[] = [];

    return json({ nodes, edges, lastUpdated: new Date().toISOString() }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    console.error("/api.graph.supabase.raw error:", err);
    return json({ error: "Failed to build raw graph from Supabase" }, { status: 500 });
  }
};

