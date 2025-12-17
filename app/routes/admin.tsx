import { json, type LoaderFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";

import GraphComponent from "../components/GraphComponent";
import GraphBuilderChat from "../components/GraphBuilderChat";
import { knowledgeGraphData } from "../data/knowledge-graph";

export const loader: LoaderFunction = async () => {
  try {
    // Use embedded data instead of file system for Cloudflare compatibility
    return json(knowledgeGraphData);
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

