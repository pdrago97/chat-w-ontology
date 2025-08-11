import 'dotenv/config';
import { json, type LoaderFunction } from "@remix-run/node";

// Proxy to Cloudflare Curator (/curate) which pulls Supabase docs, runs LangExtract upstream, returns a curated graph
// Env:
//  - LX_CF_BASE_URL: Cloudflare worker base URL (e.g., https://lx-curator.your.workers.dev)

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const base = process.env.LX_CF_BASE_URL;
    if (!base) return json({ error: 'LX_CF_BASE_URL not configured' }, { status: 500 });

    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '200';
    const model = url.searchParams.get('model') || 'gpt-4o-mini';

    const res = await fetch(`${base.replace(/\/$/, '')}/curate?limit=${encodeURIComponent(limit)}&model=${encodeURIComponent(model)}`);
    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Curator error ${res.status}: ${text}` }, { status: 502 });
    }
    const data = await res.json();
    return json(data, { headers: { 'Cache-Control': 'no-cache' } });
  } catch (err: any) {
    console.error('/api.graph.langextract.curated error', err);
    return json({ error: 'Failed to fetch curated graph' }, { status: 500 });
  }
};


