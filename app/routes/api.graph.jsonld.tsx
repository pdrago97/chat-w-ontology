import { LoaderFunction } from "@remix-run/cloudflare";
import fs from "fs/promises";
import path from "path";
import { toJsonLd } from "~/services/ontology";

export const loader: LoaderFunction = async () => {
  try {
    const filePath = path.join(process.cwd(), "public", "knowledge-graph.json");
    const fileContents = await fs.readFile(filePath, "utf-8");
    const graphData = JSON.parse(fileContents);

    const jsonld = toJsonLd(graphData);
    const body = JSON.stringify(jsonld, null, 2);

    return new Response(body, {
      headers: {
        "Content-Type": "application/ld+json; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("/api/graph.jsonld error:", error);
    return new Response(JSON.stringify({ error: "Error generating JSON-LD" }), { status: 500 });
  }
};

