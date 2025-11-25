import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import fs from "fs/promises";
import path from "path";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export const loader: LoaderFunction = async () => {
  let graphData = { nodes: [], edges: [] };
  let source = "file";

  try {
    // 1. Try fetching from Python Backend (Cognee)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for graph fetch

    const res = await fetch(`${BACKEND_URL}/graph`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.nodes && data.nodes.length > 0) {
        graphData = data;
        source = "cognee";
        console.log("Loaded graph from Cognee Backend");
      }
    }
  } catch (e) {
    console.warn("Failed to fetch graph from backend, falling back to local file:", e);
  }

  // 2. Fallback to local JSON if backend yielded nothing
  if (graphData.nodes.length === 0) {
    try {
      const filePath = path.join(process.cwd(), "public", "knowledge-graph.json");
      const fileContents = await fs.readFile(filePath, "utf-8");
      graphData = JSON.parse(fileContents);
      source = "file";
      console.log("Loaded graph from local JSON file");
    } catch (error) {
      console.error("Error reading knowledge-graph.json:", error);
      return json({ error: "Error loading graph data" }, { status: 500 });
    }
  }
    
  // Add timestamp for cache busting
  const response = {
    ...graphData,
    source,
    lastUpdated: new Date().toISOString()
  };
    
  return json(response, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
};
