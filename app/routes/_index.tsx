import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import GraphComponent from "../components/GraphComponent";
import ChatBotSidebar from "../components/ChatBotSidebar";
import GraphBuilderChat from "../components/GraphBuilderChat";
import LanguageToggle from "../components/LanguageToggle";
import { LanguageProvider } from "../contexts/LanguageContext";
import WelcomeModal from "./welcomeModal";

// Graph API endpoints
const COGNEE_GRAPH_API = "/api/graph/cognee";
const LANGEXTRACT_GRAPH_API = "/api/graph/langextract.db";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const origin = new URL(request.url).origin;
    // Default to "cognee" for the enriched cognified graph
    const graphSource = process.env.GRAPH_SOURCE || "cognee";

    // Use cognified graph (default) - enriched with technologies and concepts
    if (graphSource === "cognee") {
      const res = await fetch(origin + COGNEE_GRAPH_API);
      if (!res.ok) throw new Error(`Cognee graph error ${res.status}`);
      const graphData = await res.json();
      return json(graphData);
    }

    // Use langextract database graph
    if (graphSource === "langextract") {
      const res = await fetch(origin + LANGEXTRACT_GRAPH_API);
      if (!res.ok) throw new Error(`Langextract graph error ${res.status}`);
      const graphData = await res.json();
      return json(graphData);
    }

    // Fallback to static file graph
    const [{ default: fs }, { default: path }] = await Promise.all([
      import("fs/promises"),
      import("path"),
    ]);
    const filePath = path.join(process.cwd(), "public", "knowledge-graph.json");
    const fileContents = await fs.readFile(filePath, "utf-8");
    const graphData = JSON.parse(fileContents);
    return json(graphData);
  } catch (error) {
    console.error("Error loading graph data:", error);
    throw new Response("Error loading graph data", { status: 500 });
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