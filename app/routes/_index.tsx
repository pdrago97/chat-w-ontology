import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import GraphComponent from "../components/GraphComponent";
import ChatBotSidebar from "../components/ChatBotSidebar";
import LanguageToggle from "../components/LanguageToggle";
import { LanguageProvider } from "../contexts/LanguageContext";
import WelcomeModal from "./welcomeModal";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GRAPH_SOURCE = process.env.GRAPH_SOURCE || "file"; // "file" | "cognee-live" | "cognee-db"
const COGNEE_PROXY_LIVE = "/api.graph.fromSupabase";
const COGNEE_PROXY_DB = "/api.graph.fromDb";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const origin = new URL(request.url).origin;

    if (GRAPH_SOURCE === "cognee-live") {
      const res = await fetch(origin + COGNEE_PROXY_LIVE);
      if (!res.ok) throw new Error(`Cognee live error ${res.status}`);
      const graphData = await res.json();
      return json(graphData);
    }

    if (GRAPH_SOURCE === "cognee-db") {
      const res = await fetch(origin + COGNEE_PROXY_DB);
      if (!res.ok) throw new Error(`Cognee db error ${res.status}`);
      const graphData = await res.json();
      return json(graphData);
    }

    const filePath = path.join(__dirname, "..", "..", "public", "knowledge-graph.json");
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

        {/* Sidebar */}
        <div className="relative h-full border-l border-gray-200 bg-white shadow-lg">
          <ChatBotSidebar graphData={graphData} />
        </div>
      </div>

      <WelcomeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </LanguageProvider>
  );
}