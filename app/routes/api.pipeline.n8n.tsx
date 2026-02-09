import { json, type ActionFunction } from "@remix-run/cloudflare";

// Single endpoint to kick off a full doc->vector->graph pipeline via n8n
// POST body may include: { action: 'ingest'|'refresh'|'rebuild', sources?: any }
// This is an optional convenience wrapper around your n8n pipeline webhook.

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const body = await request.json();
    const url = process.env.N8N_PIPELINE_WEBHOOK_URL;
    if (!url) return json({ error: 'N8N_PIPELINE_WEBHOOK_URL not configured' }, { status: 500 });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    let out: any; try { out = await res.json(); } catch { out = { ok: res.ok, status: res.status, text: await res.text() }; }
    return json(out);
  } catch (e) {
    console.error('/api.pipeline.n8n error', e);
    return json({ error: 'Pipeline webhook failed' }, { status: 500 });
  }
};

export default function Route() { return null as any; }

