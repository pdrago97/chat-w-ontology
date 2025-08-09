import { json, type ActionFunction } from "@remix-run/node";

const SERVICE_URL = process.env.COGNEE_SERVICE_URL || "http://127.0.0.1:8765";

export const action: ActionFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit") || "200";
    const res = await fetch(`${SERVICE_URL}/graph/regenerate?limit=${encodeURIComponent(limit)}`, {
      method: "POST",
    });
    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Cognee regenerate error: ${res.status} ${text}` }, { status: 502 });
    }
    const data = await res.json();
    return json(data);
  } catch (err: any) {
    console.error("Error calling Cognee /graph/regenerate:", err);
    return json({ error: "Error regenerating graph" }, { status: 500 });
  }
};

