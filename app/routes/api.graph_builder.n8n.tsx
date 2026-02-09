import { json, type ActionFunction } from "@remix-run/cloudflare";

// Proxy for the Graph-Builder n8n webhook.
// Security-first: requires N8N_GRAPH_BUILDER_WEBHOOK_URL to be set.
// Passes through { message, language, history, graphData, sessionId } and
// expects a JSON envelope with optional keys:
// { assistant_message?: string, follow_up_questions?: string[], proposed_changes?: any[] }

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  try {
    const body = await request.json();
    const webhookUrl = process.env.N8N_GRAPH_BUILDER_WEBHOOK_URL ||
      'https://n8n-moveup-u53084.vm.elestio.app/webhook/9ba11544-5c4e-4f91-818a-08a4ecb596c5';

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    let out: any = null;
    try { out = await res.json(); } catch { out = { assistant_message: await res.text() }; }

    // Normalize common alternatives just in case the workflow returns different keys
    const assistant_message = out.assistant_message || out.reply || out.message || out.text || undefined;
    const follow_up_questions = Array.isArray(out.follow_up_questions) ? out.follow_up_questions : undefined;
    const proposed_changes = Array.isArray(out.proposed_changes) ? out.proposed_changes : undefined;

    return json({ assistant_message, follow_up_questions, proposed_changes });
  } catch (err) {
    console.error("/api.graph_builder.n8n error:", err);
    return json({ error: "Graph Builder webhook failed" }, { status: 500 });
  }
};

export default function Route() { return null as any; }

