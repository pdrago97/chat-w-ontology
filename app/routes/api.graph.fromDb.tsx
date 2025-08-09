import { json, type LoaderFunction } from "@remix-run/node";

const SERVICE_URL = process.env.COGNEE_SERVICE_URL || "http://127.0.0.1:8765";

export const loader: LoaderFunction = async () => {
  try {
    const res = await fetch(`${SERVICE_URL}/graph/current`);
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
    console.error("Error calling Cognee service /graph/current:", err);
    return json({ error: "Error fetching graph from DB via Cognee service" }, { status: 500 });
  }
};

