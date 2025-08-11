export interface Env {
  // Optional upstream LangExtract service (FastAPI) /extract endpoint
  UPSTREAM_URL?: string;
  SERVICE_TOKEN?: string; // optional bearer token for upstream
  // Supabase for pulling documents
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string; // store as a secret in Cloudflare
  // OpenAI for worker-native curation (no upstream required)
  OPENAI_API_KEY?: string;
}

function json(data: any, init: ResponseInit = {}) {
  const headers = { "content-type": "application/json", ...(init.headers || {}) } as Record<string, string>;
  return new Response(JSON.stringify(data), { ...init, headers });
}

async function upstreamExtract(payload: any, env: Env): Promise<Response> {
  if (!env.UPSTREAM_URL) return new Response("", { status: 404 });
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (env.SERVICE_TOKEN) headers["Authorization"] = `Bearer ${env.SERVICE_TOKEN}`;
  return fetch(env.UPSTREAM_URL, { method: "POST", headers, body: JSON.stringify(payload) });
}

async function workerNativeCurate(text: string, model: string, env: Env): Promise<any> {
  if (!env.OPENAI_API_KEY) return { error: "OPENAI_API_KEY not configured on Worker" };
  const system = `You convert resume/curriculum text into a knowledge graph with nodes and edges.\n` +
    `Node types: Person, Education, Experience, Project, Skill, Group, Status.\n` +
    `Edges use relation like WORKED_AT, STUDIED_AT, CREATED, USED_SKILLS, MEMBER_OF.\n` +
    `Return STRICT JSON with keys: nodes (array), edges (array), proposed_changes (array). No prose.`;
  const user = `TEXT BEGIN\n${text}\nTEXT END\nProduce JSON now.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  if (!res.ok) return { error: `OpenAI error ${res.status}: ${await res.text()}` };
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  try { return JSON.parse(content); } catch { return { error: 'Model did not return valid JSON', raw: content }; }
}

async function handleExtract(request: Request, env: Env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return json({ error: "Content-Type must be application/json" }, { status: 415 });

  let payload: any; try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }); }
  // If upstream is configured, forward; otherwise perform worker-native curation (text field)
  if (env.UPSTREAM_URL) {
    const r = await upstreamExtract(payload, env);
    const text = await r.text();
    const contentType = r.headers.get("content-type") || "application/json";
    return new Response(text, { status: r.status, headers: { "content-type": contentType } });
  }
  const text = String(payload?.text || '');
  if (!text) return json({ error: 'Provide text when using worker-native mode' }, { status: 400 });
  const out = await workerNativeCurate(text, payload?.model_id || 'gpt-4o-mini', env);
  return json({ ...out, lastUpdated: new Date().toISOString() });
}

async function handleCurate(request: Request, env: Env) {
  // Fetch documents from Supabase, then either forward to upstream or do worker-native OpenAI curation
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return json({ error: "Supabase not configured" }, { status: 500 });

  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get("limit") || 200)));
  const model = url.searchParams.get("model") || "gpt-4o-mini";

  const headers = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` };
  const docsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/documents?select=id,content,metadata&limit=${limit}`, { headers });
  if (!docsRes.ok) return json({ error: `Supabase error ${docsRes.status}`, text: await docsRes.text() }, { status: 502 });
  const rows: any[] = await docsRes.json();
  const texts = rows.map(r => (r?.content ? String(r.content) : "")).filter(Boolean);
  if (texts.length === 0) return json({ nodes: [], edges: [], proposed_changes: [], info: "No content rows found." });

  const bigText = texts.join("\n\n---\n\n");

  if (env.UPSTREAM_URL) {
    const r = await upstreamExtract({ text: bigText, model_id: model, extraction_passes: 2, max_workers: 6 }, env);
    if (!r.ok) return json({ error: `LangExtract error ${r.status}`, text: await r.text() }, { status: 502 });
    const out = await r.json();
    return json({ ...out, lastUpdated: new Date().toISOString() }, { headers: { "cache-control": "no-cache" } });
  }

  // Worker-native
  const out = await workerNativeCurate(bigText, model, env);
  return json({ ...out, lastUpdated: new Date().toISOString() }, { headers: { "cache-control": "no-cache" } });
}

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/extract") return handleExtract(request, env);
    if (url.pathname === "/curate") return handleCurate(request, env);
    return json({ error: "Not found" }, { status: 404 });
  },
};

