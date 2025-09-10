import React, { useState, useRef } from "react";

interface Props {
  onGraphUpdate: (g: any) => void;
}

const GraphTools: React.FC<Props> = ({ onGraphUpdate }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function parseJsonSafe(res: Response) {
    try {
      return await res.json();
    } catch {
      const text = await res.text();
      return { error: `Non-JSON response (${res.status})`, raw: text } as any;
    }
  }

  async function loadFrom(url: string) {
    try {
      setBusy(true);
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const payload = await parseJsonSafe(res);
        console.error("GraphTools loadFrom failed:", url, res.status, payload);
        alert(`Failed to load graph: ${res.status}. See console for details.`);
        return;
      }
      const data = await parseJsonSafe(res);
      onGraphUpdate(data);
    } catch (e) {
      console.error("GraphTools loadFrom error", url, e);
      alert("Failed to load graph. Check console.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1 rounded-md bg-gray-800 text-white shadow hover:bg-gray-700"
      >
        {busy ? "Working..." : "Graph Tools"}
      </button>

      {open && (
        <div className="absolute mt-2 w-80 p-3 bg-white border rounded-lg shadow-lg z-50">
          <div className="text-xs text-gray-500 mb-2">Sources</div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <button className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200" onClick={() => loadFrom("/api.graph")}>Curated JSON</button>
            <button className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200" onClick={() => loadFrom("/api.graph.supabase.raw?limit=400")}>Supabase (Raw)</button>
            <button className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200" onClick={() => loadFrom("/api.graph.langextract.curated")}>LangExtract (Curated)</button>
          </div>

          <div className="text-xs text-gray-500">Manual refresh only. Switch sources any time.</div>
        </div>
      )}
    </div>
  );
};

export default GraphTools;

