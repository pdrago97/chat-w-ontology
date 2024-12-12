import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import GraphComponent from "../components/GraphComponent";
import ChatBotSidebar from "../components/ChatBotSidebar";
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
  const graphData = useLoaderData();
  const [isModalOpen, setIsModalOpen] = useState(true);

  if (!graphData) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex h-screen w-full bg-white">
        {/* Main graph area */}
        <div className="flex-1 h-full relative">
          <div className="absolute inset-0">
            <GraphComponent graphData={graphData} />
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
    </>
  );
}