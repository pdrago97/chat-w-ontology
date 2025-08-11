import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import GraphComponent from "../components/GraphComponent";
import GraphBuilderChat from "../components/GraphBuilderChat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const loader: LoaderFunction = async () => {
  try {
    const filePath = path.join(__dirname, "..", "..", "public", "knowledge-graph.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return json(JSON.parse(raw));
  } catch (e) {
    console.error("/admin loader error", e);
    return json({ nodes: [], edges: [] });
  }
};

export default function Admin() {
  const initialGraph = useLoaderData<any>();
  const [graphData, setGraphData] = useState(initialGraph);

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Main graph */}
      <div className="flex-1 h-full relative">
        <div className="absolute inset-0">
          <GraphComponent graphData={graphData} onGraphUpdate={setGraphData} />
        </div>
      </div>
      {/* Backoffice builder chat */}
      <div className="relative h-full border-l border-gray-200 bg-white shadow-lg flex">
        <GraphBuilderChat graphData={graphData} onApplied={setGraphData} />
      </div>
    </div>
  );
}

