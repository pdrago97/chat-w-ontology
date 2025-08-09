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
      'https://n8n-moveup-u53084.vm.elestio.app/webhook/9ba11544-5c4e-4f91-818a-08a4ecb596c5';

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language, history })
    });

    // Try to parse { reply } or fallback
    let out: any = null;
    try { out = await res.json(); } catch { out = { reply: await res.text() }; }

    const reply = out.reply || out.message || out.text || out.answer || String(out);
    return json({ response: reply });
  } catch (err: any) {
    console.error("/api.chat.n8n error:", err);
    return json({ error: "Chat webhook failed" }, { status: 500 });
  }
};

