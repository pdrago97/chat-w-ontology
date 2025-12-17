import { json } from "@remix-run/cloudflare";
import type { LoaderFunction } from "@remix-run/cloudflare";
import fs from "fs/promises";
import path from "path";

export const loader: LoaderFunction = async () => {
  try {
    // Simple path resolution from project root
    const filePath = path.join(process.cwd(), "public", "knowledge-graph.json");
    const fileContents = await fs.readFile(filePath, "utf-8");
    const graphData = JSON.parse(fileContents);
    
    // Add timestamp for cache busting
    const response = {
      ...graphData,
      lastUpdated: new Date().toISOString()
    };
    
    return json(response, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error) {
    console.error("Error reading knowledge-graph.json:", error);
    return json({ error: "Error loading graph data" }, { status: 500 });
  }
};
