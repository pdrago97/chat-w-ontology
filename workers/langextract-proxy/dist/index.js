// src/index.ts
function json(data, init = {}) {
  const headers = { "content-type": "application/json", ...init.headers || {} };
  return new Response(JSON.stringify(data), { ...init, headers });
}
async function upstreamExtract(payload, env) {
  if (!env.UPSTREAM_URL) return new Response("", { status: 404 });
  const headers = { "content-type": "application/json" };
  if (env.SERVICE_TOKEN) headers["Authorization"] = `Bearer ${env.SERVICE_TOKEN}`;
  return fetch(env.UPSTREAM_URL, { method: "POST", headers, body: JSON.stringify(payload) });
}
async function workerNativeCurate(text, model, env) {
  if (!env.OPENAI_API_KEY) return { error: "OPENAI_API_KEY not configured on Worker" };
  const system = `You convert resume/curriculum text into a knowledge graph with nodes and edges.
Node types: Person, Education, Experience, Project, Skill, Group, Status.
Edges use relation like WORKED_AT, STUDIED_AT, CREATED, USED_SKILLS, MEMBER_OF.
Return STRICT JSON with keys: nodes (array), edges (array), proposed_changes (array). No prose.`;
  const user = `TEXT BEGIN
${text}
TEXT END
Produce JSON now.`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  if (!res.ok) return { error: `OpenAI error ${res.status}: ${await res.text()}` };
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { error: "Model did not return valid JSON", raw: content };
  }
}
async function handleExtract(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return json({ error: "Content-Type must be application/json" }, { status: 415 });
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (env.UPSTREAM_URL) {
    const r = await upstreamExtract(payload, env);
    const text2 = await r.text();
    const contentType = r.headers.get("content-type") || "application/json";
    return new Response(text2, { status: r.status, headers: { "content-type": contentType } });
  }
  const text = String(payload?.text || "");
  if (!text) return json({ error: "Provide text when using worker-native mode" }, { status: 400 });
  const out = await workerNativeCurate(text, payload?.model_id || "gpt-4o-mini", env);
  return json({ ...out, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() });
}
async function handleCurate(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return json({ error: "Supabase not configured" }, { status: 500 });
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(1e3, Number(url.searchParams.get("limit") || 200)));
  const model = url.searchParams.get("model") || "gpt-4o-mini";
  const headers = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` };
  const docsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/documents?select=id,content,metadata&limit=${limit}`, { headers });
  if (!docsRes.ok) return json({ error: `Supabase error ${docsRes.status}`, text: await docsRes.text() }, { status: 502 });
  const rows = await docsRes.json();
  const texts = rows.map((r) => r?.content ? String(r.content) : "").filter(Boolean);
  if (texts.length === 0) return json({ nodes: [], edges: [], proposed_changes: [], info: "No content rows found." });
  const bigText = texts.join("\n\n---\n\n");
  if (env.UPSTREAM_URL) {
    const r = await upstreamExtract({ text: bigText, model_id: model, extraction_passes: 2, max_workers: 6 }, env);
    if (!r.ok) return json({ error: `LangExtract error ${r.status}`, text: await r.text() }, { status: 502 });
    const out2 = await r.json();
    return json({ ...out2, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() }, { headers: { "cache-control": "no-cache" } });
  }
  const out = await workerNativeCurate(bigText, model, env);
  return json({ ...out, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() }, { headers: { "cache-control": "no-cache" } });
}
var src_default = {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/extract") return handleExtract(request, env);
    if (url.pathname === "/curate") return handleCurate(request, env);
    return json({ error: "Not found" }, { status: 404 });
  }
};
export {
  src_default as default
};
