import { json, type ActionFunction } from "@remix-run/cloudflare";

const SERVICE_URL = process.env.COGNEE_SERVICE_URL || "http://127.0.0.1:8765";

export const action: ActionFunction = async ({ request }) => {
  try {
    const payload = await request.json();
    const res = await fetch(`${SERVICE_URL}/graph/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Cognee import error: ${res.status} ${text}` }, { status: 502 });
    }
    const data = await res.json();
    return json(data);
  } catch (err: any) {
    console.error("Error calling Cognee /graph/import:", err);
    return json({ error: "Error importing graph" }, { status: 500 });
  }
};

