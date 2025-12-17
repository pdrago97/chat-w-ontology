import { json, type LoaderFunction } from "@remix-run/cloudflare";
import { knowledgeGraphData } from "../data/knowledge-graph";

// Proxy to Cloudflare Curator (/curate) which pulls Supabase docs, runs LangExtract upstream, returns a curated graph
// Env:
//  - LX_CF_BASE_URL: Cloudflare worker base URL (e.g., https://lx-curator.your.workers.dev)

export const loader: LoaderFunction = async ({ request, context }) => {
  try {
    // Get LX_CF_BASE_URL from Cloudflare environment
    const env = context?.env as Record<string, string> | undefined;
    const base = env?.LX_CF_BASE_URL;

    if (!base) {
      // Return embedded fallback data if not configured
      console.warn('LX_CF_BASE_URL not configured, using embedded graph');
      return json({ nodes: knowledgeGraphData.nodes, edges: [], skills: knowledgeGraphData.skills }, { headers: { 'Cache-Control': 'no-cache' } });
    }

    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '200';
    const model = url.searchParams.get('model') || 'gpt-4o-mini';

    const res = await fetch(`${base.replace(/\/$/, '')}/curate?limit=${encodeURIComponent(limit)}&model=${encodeURIComponent(model)}`);
    if (!res.ok) {
      const text = await res.text();
      console.warn(`Curator error ${res.status}: ${text}, using embedded graph`);
      return json({ nodes: knowledgeGraphData.nodes, edges: [], skills: knowledgeGraphData.skills }, { headers: { 'Cache-Control': 'no-cache' } });
    }
    const data = await res.json();
    return json(data, { headers: { 'Cache-Control': 'no-cache' } });
  } catch (err: any) {
    console.error('/api.graph.langextract.curated error', err);
    return json({ nodes: knowledgeGraphData.nodes, edges: [], skills: knowledgeGraphData.skills }, { headers: { 'Cache-Control': 'no-cache' } });
  }
};


