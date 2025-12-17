import { json, LoaderFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import GraphComponent from "../components/GraphComponent";
import ChatBotSidebar from "../components/ChatBotSidebar";
import GraphBuilderChat from "../components/GraphBuilderChat";
import LanguageToggle from "../components/LanguageToggle";
import { LanguageProvider } from "../contexts/LanguageContext";
import WelcomeModal from "./welcomeModal";
import { knowledgeGraphData } from "../data/knowledge-graph";

// Graph API endpoints
const COGNEE_GRAPH_API = "/api/graph/cognee";
const LANGEXTRACT_GRAPH_API = "/api/graph/langextract.db";
const LANGEXTRACT_CURATED_API = "/api/graph/langextract.curated";

export const loader: LoaderFunction = async ({ request, context }) => {
  try {
    const origin = new URL(request.url).origin;
    // Get GRAPH_SOURCE from Cloudflare environment or default to "cognee"
    const env = context?.env as Record<string, string> | undefined;
    const graphSource = env?.GRAPH_SOURCE || "cognee";

    // Use langextract curated graph
    if (graphSource === "lx-curated") {
      try {
        const res = await fetch(origin + LANGEXTRACT_CURATED_API);
        if (res.ok) {
          const graphData = await res.json();
          return json(graphData);
        }
      } catch (e) {
        console.warn("Failed to fetch lx-curated graph, using fallback");
      }
    }

    // Use cognified graph (default) - enriched with technologies and concepts
    if (graphSource === "cognee") {
      try {
        const res = await fetch(origin + COGNEE_GRAPH_API);
        if (res.ok) {
          const graphData = await res.json();
          return json(graphData);
        }
      } catch (e) {
        console.warn("Failed to fetch cognee graph, using fallback");
      }
    }

    // Use langextract database graph
    if (graphSource === "langextract") {
      try {
        const res = await fetch(origin + LANGEXTRACT_GRAPH_API);
        if (res.ok) {
          const graphData = await res.json();
          return json(graphData);
        }
      } catch (e) {
        console.warn("Failed to fetch langextract graph, using fallback");
      }
    }

    // Fallback to embedded knowledge graph data (Cloudflare compatible)
    return json({ nodes: knowledgeGraphData.nodes, edges: [], skills: knowledgeGraphData.skills });
  } catch (error) {
    console.error("Error loading graph data:", error);
    // Return embedded data on error instead of throwing
    return json({ nodes: knowledgeGraphData.nodes, edges: [], skills: knowledgeGraphData.skills });
  }
};

export default function Index() {
  const initialGraphData = useLoaderData();
  const [graphData, setGraphData] = useState(initialGraphData);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleGraphUpdate = (newGraphData: any) => {
    setGraphData(newGraphData);
  };

  if (!graphData) {
    return <div>Loading...</div>;
  }

  return (
    <LanguageProvider>
      <div className="flex h-screen w-full bg-white">
        <LanguageToggle />

        {/* Main graph area */}
        <div className="flex-1 h-full relative">
          <div className="absolute inset-0">
            <GraphComponent graphData={graphData} onGraphUpdate={handleGraphUpdate} />
          </div>
        </div>

        {/* Right side: chat only */}
        <div className="relative h-full border-l border-gray-200 bg-white shadow-lg flex flex-col w-[26rem]">
          <div className="flex-1 overflow-hidden">
            <div className="hidden lg:block">
              <ChatBotSidebar graphData={graphData} />
            </div>
          </div>
        </div>
      </div>

      <WelcomeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </LanguageProvider>
  );
}