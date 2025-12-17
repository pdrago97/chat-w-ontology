import { json, type ActionFunction } from "@remix-run/cloudflare";

// Proxy to local LangExtract service for browser-friendly calls.
// Requires LANGEXTRACT_SERVICE_URL (e.g., http://127.0.0.1:8788)

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const body = await request.json();
    const base = process.env.LANGEXTRACT_SERVICE_URL || 'http://127.0.0.1:8788';
    const token = process.env.LANGEXTRACT_SERVICE_TOKEN;
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${base}/extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    let out: any = null;
    try { out = await res.json(); } catch { out = { error: await res.text() }; }
    return json(out, { status: res.status });
  } catch (err) {
    console.error('/api.langextract.extract error', err);
    return json({ error: 'LangExtract proxy failed' }, { status: 500 });
  }
};

export default function Route() { return null as any; }

