import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import GraphComponent from "../components/GraphComponent";
import ChatBotSidebar from "../components/ChatBotSidebar";
import GraphBuilderChat from "../components/GraphBuilderChat";
import LanguageToggle from "../components/LanguageToggle";
import { LanguageProvider } from "../contexts/LanguageContext";
import WelcomeModal from "./welcomeModal";


export const loader: LoaderFunction = async ({ request }) => {
  try {
    const origin = new URL(request.url).origin;
    const graphSource = process.env.GRAPH_SOURCE || "file"; // server-only

    if (graphSource === "cognee-live") {
      const res = await fetch(origin + COGNEE_PROXY_LIVE);
      if (!res.ok) throw new Error(`Cognee live error ${res.status}`);
      const graphData = await res.json();
      return json(graphData);
    }

    if (graphSource === "cognee-db") {
      const res = await fetch(origin + COGNEE_PROXY_DB);
      if (!res.ok) throw new Error(`Cognee db error ${res.status}`);
      const graphData = await res.json();
      return json(graphData);
    }

    // Always return file graph from server to avoid remote fetch during SSR.
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