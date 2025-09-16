import { json, type ActionFunction } from "@remix-run/node";

// Improved Chat API with better timeout handling
// Provides immediate feedback and helpful guidance when timeouts occur

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

    const startTime = Date.now();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    const apiKey = process.env.N8N_API_KEY || '3c8670c5abc5b1052101291e2aac2ebfee58808f4c7c53d98404f7dcbd774fceb8d8a6c338b7971a080492e7629d2da1fa2e12acd53329a491862e7d78458677';
    if (apiKey) headers['x-n8n-api-key'] = apiKey;

    const ragAuthKey = process.env.N8N_AUTH_KEY || '7f9e2a8b-4c1d-4e6f-9a3b-8d5c2e7f1a9c';
    if (ragAuthKey) headers['RAG-Auth-Key'] = ragAuthKey;

    const authHeader = process.env.N8N_CHAT_AUTH_HEADER;
    const authValue = process.env.N8N_CHAT_AUTH_VALUE;
    if (authHeader && authValue) headers[authHeader] = authValue;

    const basicUser = process.env.N8N_CHAT_BASIC_USER;
    const basicPass = process.env.N8N_CHAT_BASIC_PASS;
    if (basicUser && basicPass) {
      const b64 = Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
      headers['Authorization'] = `Basic ${b64}`;
    }

    console.log(`[N8N] Processing request: ${message.substring(0, 50)}...`);

    // Create AbortController for timeout
    const controller = new AbortController();
    // Use longer timeout for local development, shorter for production (Vercel 10s limit)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    const timeoutMs = isProduction ? 9800 : 55000; // 55s for local (N8N can take up to 60s), 9.8s for Vercel
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'User-Agent': 'Remix-Chat-Improved/1.0'
      },
      body: JSON.stringify({ message, language, history }),
      signal: controller.signal,
      keepalive: true
    });

    clearTimeout(timeoutId);

    const endTime = Date.now();
    console.log(`[N8N] Request completed in ${endTime - startTime}ms`);

    const raw = await res.text();
    let out: any;
    try {
      out = JSON.parse(raw);
    } catch (e) {
      out = { reply: raw };
    }

    const reply = out?.reply ?? out?.message ?? out?.text ?? out?.answer ?? out?.response ?? (typeof out === 'string' ? out : raw);

    if (!reply || reply.trim() === '') {
      return json({
        response: "I apologize, but I didn't receive a proper response from the AI system. Please try asking your question again, or contact Pedro directly via LinkedIn: https://www.linkedin.com/in/pedroreichow",
        ok: false,
        status: 500
      });
    }

    return json({ response: reply, ok: res.ok, status: res.status });

  } catch (error: any) {
    console.error('Error in chat endpoint:', error);

    // Handle timeout errors with helpful guidance
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return json({
        response: "⏱️ Your question requires deep analysis of Pedro's professional background. The AI system is processing complex information from his knowledge base.\n\n💡 **Tips for faster responses:**\n• Try simpler, more specific questions\n• Ask about one topic at a time\n• Questions about basic info (name, location, skills) are usually faster\n\n🔄 **Please try asking again** - the system often responds faster on retry.",
        ok: false,
        status: 408
      });
    }

    return json({
      response: "I apologize, but I encountered an error. Please try asking your question again, or contact Pedro via LinkedIn: https://www.linkedin.com/in/pedroreichow",
      ok: false,
      status: 500
    });
  }
};

