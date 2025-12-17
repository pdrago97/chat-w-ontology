import 'dotenv/config';
import { json, type LoaderFunction } from "@remix-run/cloudflare";

// GET endpoint that fetches text rows from Supabase and runs LangExtract via the Python service
// Mirrors the style of other Supabase integrations in this repo.
// Query params:
//   - limit: number of rows to read from public.documents (default 200, max 1000)
//   - model: optional model_id to pass to the service (default from env or gpt-4o-mini)

function supabaseHeaders() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } } as const;
}

const SERVICE_BASE = process.env.LANGEXTRACT_SERVICE_URL || 'http://127.0.0.1:8788';
const SERVICE_TOKEN = process.env.LANGEXTRACT_SERVICE_TOKEN;

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(1000, Number(searchParams.get('limit') || 200)));
    const model = searchParams.get('model') || process.env.LANGEXTRACT_MODEL_ID || 'gpt-4o-mini';

    const { url, headers } = supabaseHeaders();

    const res = await fetch(`${url}/rest/v1/documents?select=id,content,metadata&limit=${limit}`, { headers });
    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Supabase documents error ${res.status}: ${text}` }, { status: 502 });
    }
    const rows: any[] = await res.json();

    // Combine content into one large text buffer. LangExtract will chunk internally.
    const texts = rows
      .map(r => (r?.content ? String(r.content) : ''))
      .filter(Boolean);

    if (texts.length === 0) {
      return json({ nodes: [], edges: [], proposed_changes: [], info: 'No content rows found.' });
    }

    const bigText = texts.join('\n\n---\n\n');

    const lxHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SERVICE_TOKEN) lxHeaders['Authorization'] = `Bearer ${SERVICE_TOKEN}`;

    const lx = await fetch(`${SERVICE_BASE}/extract`, {
      method: 'POST',
      headers: lxHeaders,
      body: JSON.stringify({ text: bigText, model_id: model, extraction_passes: 2, max_workers: 6 })
    });

    if (!lx.ok) {
      const text = await lx.text();
      return json({ error: `LangExtract service error ${lx.status}: ${text}` }, { status: 502 });
    }

    const out = await lx.json();
    return json({ ...out, lastUpdated: new Date().toISOString() }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    console.error('/api.langextract.fromSupabase error:', err);
    return json({ error: 'Failed to run LangExtract over Supabase documents' }, { status: 500 });
  }
};

export default function Route() { return null as any; }

