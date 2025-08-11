import 'dotenv/config';
import { json, type ActionFunction } from "@remix-run/node";

// Proxies chat requests to the provided n8n webhook. Minimal, adaptable.
// Sends { message, language, history } and expects { reply } back.

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  try {
    const body = await request.json();
    const { message, language = 'en', history = [] } = body || {};

    if (!message || typeof message !== 'string') {
      return json({ error: 'Missing message' }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL ||
      'https://n8n-moveup-u53084.vm.elestio.app/webhook-test/9ba11544-5c4e-4f91-818a-08a4ecb596c5';

    // Optional authentication headers for n8n webhook (single-env friendly)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // 1) Single env token support (preferred): N8N_API_KEY
    // Send X-N8N-API-KEY header (your webhook accepts this, not Bearer)
    const apiKey = process.env.N8N_API_KEY;
    if (apiKey) {
      headers['X-N8N-API-KEY'] = apiKey;
    }

    // 2) Explicit custom header override (takes precedence if set)
    const authHeader = process.env.N8N_CHAT_AUTH_HEADER;
    const authValue = process.env.N8N_CHAT_AUTH_VALUE;
    if (authHeader && authValue) headers[authHeader] = authValue;

    // 3) Basic Auth (if provided) will override Authorization header
    const basicUser = process.env.N8N_CHAT_BASIC_USER;
    const basicPass = process.env.N8N_CHAT_BASIC_PASS;
    if (basicUser && basicPass) {
      const b64 = Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
      headers['Authorization'] = `Basic ${b64}`;
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, language, history })
    });

    // Read once, then try JSON parse, else use raw text
    const raw = await res.text();
    let out: any;
    try { out = JSON.parse(raw); } catch { out = { reply: raw }; }

    const reply = out?.reply ?? out?.message ?? out?.text ?? out?.answer ?? (typeof out === 'string' ? out : raw);
    return json({ response: reply, ok: res.ok, status: res.status });
  } catch (err: any) {
    console.error("/api.chat.n8n error:", err);
    return json({ error: "Chat webhook failed" }, { status: 500 });
  }
};

