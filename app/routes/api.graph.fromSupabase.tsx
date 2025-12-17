import { json, type LoaderFunction } from "@remix-run/cloudflare";

// Minimal proxy loader that calls the local FastAPI Cognee service
// Default service URL can be overridden with COGNEE_SERVICE_URL env var

const SERVICE_URL = process.env.COGNEE_SERVICE_URL || "http://127.0.0.1:8765";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit") || "200";

    const res = await fetch(`${SERVICE_URL}/graph/from-supabase?limit=${encodeURIComponent(limit)}`);

    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Cognee service error: ${res.status} ${text}` }, { status: 502 });
    }

    const graph = await res.json();

    return json(graph, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    console.error("Error calling Cognee service:", err);
    return json({ error: "Error fetching graph from Cognee service" }, { status: 500 });
  }
};

