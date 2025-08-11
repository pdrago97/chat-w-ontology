import React, { useState } from 'react';

interface Props { graphData: any; onApplied?: (graph:any)=>void }

export default function GraphBuilderChat({ graphData, onApplied }: Props) {
  const [history, setHistory] = useState<{role:'user'|'assistant', content:string}[]>([]);
  const [input, setInput] = useState('');
  const [proposals, setProposals] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(200);

  const send = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    const userMsg = { role:'user' as const, content: input };
    setHistory(h => [...h, userMsg]);
    setInput('');
    try {
      const res = await fetch('/api.graph_builder.n8n', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: userMsg.content, history, graphData })
      });
      const data = await res.json();
      if (data.assistant_message) setHistory(h => [...h, { role:'assistant', content: data.assistant_message }]);
      setProposals(Array.isArray(data.proposed_changes) ? data.proposed_changes : []);
      // If only questions
      if (Array.isArray(data.follow_up_questions) && data.follow_up_questions.length) {
        setHistory(h => [...h, { role:'assistant', content: 'Questions: '+ data.follow_up_questions.join(' | ') }]);
      }
    } catch (e) {
      setHistory(h => [...h, { role:'assistant', content: 'Error contacting builder agent.' }]);
    } finally { setBusy(false); }
  };

  const accept = async (idx: number) => {
    const change = proposals[idx];
    try {
      const res = await fetch('/api.graph.applyChanges', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ changes: [change] })
      });
      const data = await res.json();
      if (data?.ok) {
        setProposals(p => p.filter((_,i)=>i!==idx));
        onApplied?.(data.graph);
        setHistory(h => [...h, { role:'assistant', content: 'Change applied.' }]);
      } else {
        setHistory(h => [...h, { role:'assistant', content: 'Failed to apply change.' }]);
      }
    } catch { setHistory(h => [...h, { role:'assistant', content: 'Failed to apply change.' }]); }
  };

  const decline = (idx:number) => { setProposals(p => p.filter((_,i)=>i!==idx)); };

  return (
    <div className="w-[380px] h-full flex flex-col border-l bg-white">
      <div className="p-3 border-b font-semibold flex items-center justify-between">
        <span>Graph Builder</span>
        <div className="flex items-center gap-2 text-sm">
          <input type="number" min={1} max={1000} value={limit} onChange={e=>setLimit(Math.max(1, Math.min(1000, Number(e.target.value)||200)))} className="w-16 border rounded px-1 py-0.5" />
          <button onClick={async()=>{
            if (busy) return; setBusy(true);
            try {
              const res = await fetch(`/api/graph/langextract/curated?limit=${encodeURIComponent(String(limit))}`);
              const data = await res.json();
              if (Array.isArray(data?.proposed_changes)) setProposals(data.proposed_changes);
              else setProposals([]);
              setHistory(h => [...h, { role:'assistant', content: `LangExtract proposed ${data?.proposed_changes?.length||0} change(s)` }]);
            } catch (e) {
              setHistory(h => [...h, { role:'assistant', content: 'LangExtract fetch failed.' }]);
            } finally { setBusy(false); }
          }} className="px-2 py-1 rounded bg-emerald-600 text-white">Run LX</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {history.map((m, i) => (
          <div key={i} className={m.role==='user'?'text-right':''}>
            <div className={`inline-block px-3 py-2 rounded-lg ${m.role==='user'?'bg-slate-900 text-white':'bg-slate-100 text-slate-900'}`}>{m.content}</div>
          </div>
        ))}
        {proposals.length>0 && (
          <div className="space-y-2">
            <div className="text-sm text-slate-600">Proposed changes</div>
            {proposals.map((ch, i) => (
              <div key={i} className="border rounded p-2 bg-white text-sm">
                <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(ch, null, 2)}</pre>
                <div className="mt-2 flex gap-2">
                  <button onClick={()=>accept(i)} className="px-2 py-1 bg-emerald-600 text-white rounded">Accept</button>
                  <button onClick={()=>decline(i)} className="px-2 py-1 bg-slate-200 text-slate-900 rounded">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input className="flex-1 border rounded px-2 py-1" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask to add missing projects, edges, etc."/>
        <button onClick={send} disabled={busy} className="px-3 py-1 rounded bg-blue-600 text-white">Send</button>
      </div>
    </div>
  );
}

