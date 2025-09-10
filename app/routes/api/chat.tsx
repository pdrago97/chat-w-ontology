import { json, type ActionFunction } from "@remix-run/node";

// Chat API route for N8N webhook integration
// This route handles chat requests and forwards them to the N8N webhook

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

    // Temporary debug log for production
    console.log('Production Debug - API Key present:', !!process.env.N8N_API_KEY);
    console.log('Production Debug - API Key length:', process.env.N8N_API_KEY?.length || 0);

    const startTime = Date.now();

    // Optional authentication headers for n8n webhook (single-env friendly)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // 1) Single env token support (preferred): N8N_API_KEY
    // Send x-n8n-api-key header (based on n8n webhook configuration)
    const apiKey = process.env.N8N_API_KEY || '3c8670c5abc5b1052101291e2aac2ebfee58808f4c7c53d98404f7dcbd774fceb8d8a6c338b7971a080492e7629d2da1fa2e12acd53329a491862e7d78458677';
    if (apiKey) {
      headers['x-n8n-api-key'] = apiKey;
    }

    // Add RAG-Auth-Key header (required by N8N workflow)
    const ragAuthKey = process.env.N8N_AUTH_KEY || '7f9e2a8b-4c1d-4e6f-9a3b-8d5c2e7f1a9c';
    if (ragAuthKey) {
      headers['RAG-Auth-Key'] = ragAuthKey;
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

    // Create AbortController for timeout (Vercel Hobby plan has 10s limit - be conservative)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500); // 8.5 seconds - conservative timeout

    console.log(`[N8N] Starting request to: ${webhookUrl}`);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      body: JSON.stringify({ message, language, history }),
      signal: controller.signal,
      keepalive: true
    });

    clearTimeout(timeoutId);
    const endTime = Date.now();
    console.log(`[N8N] Request completed in ${endTime - startTime}ms`);

    // Read once, then try JSON parse, else use raw text
    const raw = await res.text();
    let out: any;
    try { out = JSON.parse(raw); } catch { out = { reply: raw }; }

    const reply = out?.reply ?? out?.message ?? out?.text ?? out?.answer ?? (typeof out === 'string' ? out : raw);
    console.log(`[N8N] Response received:`, { reply: reply?.substring(0, 100) + '...' });
    return json({ response: reply, ok: res.ok, status: res.status });
  } catch (err: any) {
    const endTime = Date.now();
    console.error(`[N8N] Error after ${endTime - startTime}ms:`, err.name, err.message);

    if (err.name === 'AbortError') {
      return json({
        response: "⏱️ The AI is taking longer than usual to process your question. This happens with complex queries that require deep analysis of Pedro's professional background. Please try asking again - the system will respond faster on retry, or try a more specific question.",
        ok: false,
        status: 408
      }, { status: 200 }); // Return 200 so frontend can display the message
    }

    return json({ error: "Chat webhook failed" }, { status: 500 });
  }
};

// Default export required for Remix route recognition
export default function ChatN8NRoute() {
  return null;
}

