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

export const loader: LoaderFunction = async () => {
  try {
    const filePath = path.join(__dirname, "..", "..", "public", "knowledge-graph.json");
    const fileContents = await fs.readFile(filePath, "utf-8");
    const graphData = JSON.parse(fileContents);
    console.log("Loaded graph data:", graphData); // Debug log
    return json(graphData);
  } catch (error) {
    console.error("Error reading knowledge-graph.json:", error);
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
        {/* Language Toggle - Top Right */}
        <div className="absolute top-4 right-4 z-50">
          <LanguageToggle />
        </div>

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