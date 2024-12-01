import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import GraphComponent from "../components/GraphComponent";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const loader: LoaderFunction = async () => {
  try {
    // Adjust the path to point to the public directory from the current file location
    const filePath = path.join(__dirname, "..", "..", "public", "knowledge-graph.json");
    const fileContents = await fs.readFile(filePath, "utf-8");
    const graphData = JSON.parse(fileContents);
    return json(graphData);
  } catch (error) {
    console.error("Error reading knowledge-graph.json:", error);
    throw new Response("Error loading graph data", { status: 500 });
  }
};

export default function Index() {
  const graphData = useLoaderData();

  if (!graphData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex">
      <GraphComponent graphData={graphData} />
    </div>
  );
}