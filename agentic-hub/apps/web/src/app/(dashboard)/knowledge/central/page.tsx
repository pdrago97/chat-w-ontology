'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Network, GitMerge, RefreshCw, Check, Eye, Zap, Clock, Database } from 'lucide-react';

interface GraphSummary {
  id: string;
  name: string;
  source: string;
  nodeCount: number;
  edgeCount: number;
  created_at: string;
  updated_at: string;
  meta?: { source_item_id?: string };
}

interface MergedStats {
  totalNodes: number;
  totalEdges: number;
  uniqueEntities: number;
  graphCount: number;
}

export default function KnowledgeCentralPage() {
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [mergedStats, setMergedStats] = useState<MergedStats | null>(null);

  useEffect(() => {
    fetch('/api/graphs')
      .then(r => r.json())
      .then(data => setGraphs(data.graphs || []))
      .finally(() => setLoading(false));
  }, []);

  function toggleSelect(id: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelected(newSelected);
  }

  function selectAll() {
    if (selected.size === graphs.length) setSelected(new Set());
    else setSelected(new Set(graphs.map(g => g.id)));
  }

  async function mergeGraphs() {
    if (selected.size < 2) return;
    setMerging(true);

    try {
      const res = await fetch('/api/graphs/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMergedStats(data.stats);
      }
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/knowledge" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-400" /> Central de Conhecimento
          </h1>
          <p className="text-slate-400">Visualize e mescle grafos para criar uma base unificada</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-sm text-slate-400">Grafos Totais</p>
          <p className="text-2xl font-bold text-blue-400">{graphs.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-sm text-slate-400">Selecionados</p>
          <p className="text-2xl font-bold text-green-400">{selected.size}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-sm text-slate-400">Total Entidades</p>
          <p className="text-2xl font-bold text-purple-400">{graphs.reduce((s, g) => s + g.nodeCount, 0)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-sm text-slate-400">Total Relações</p>
          <p className="text-2xl font-bold text-orange-400">{graphs.reduce((s, g) => s + g.edgeCount, 0)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={selectAll}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
          {selected.size === graphs.length ? 'Desselecionar Todos' : 'Selecionar Todos'}
        </button>
        <button onClick={mergeGraphs} disabled={selected.size < 2 || merging}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg">
          <GitMerge className={`w-4 h-4 ${merging ? 'animate-spin' : ''}`} />
          Mesclar Selecionados ({selected.size})
        </button>
        <Link href="/knowledge/graph"
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
          <Eye className="w-4 h-4" /> Visualizar Grafo Unificado
        </Link>
      </div>

      {mergedStats && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4">
          <h4 className="text-green-400 font-semibold flex items-center gap-2"><Check className="w-4 h-4" /> Merge Concluído!</h4>
          <p className="text-slate-300 text-sm mt-1">
            {mergedStats.graphCount} grafos mesclados • {mergedStats.uniqueEntities} entidades únicas • {mergedStats.totalEdges} relações
          </p>
        </div>
      )}

      {/* Graph List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando grafos...</div>
      ) : graphs.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Network className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Nenhum grafo criado</h3>
          <p className="text-slate-400 mb-4">Vá para um documento e clique em "Gerar Grafo" para começar</p>
          <Link href="/knowledge" className="text-blue-400 hover:text-blue-300">← Voltar para Knowledge Base</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {graphs.map(graph => (
            <div key={graph.id} onClick={() => toggleSelect(graph.id)}
              className={`bg-slate-800/50 border rounded-xl p-4 cursor-pointer transition-all ${
                selected.has(graph.id) ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selected.has(graph.id) ? 'border-blue-500 bg-blue-500' : 'border-slate-600'}`}>
                  {selected.has(graph.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <Network className="w-8 h-8 text-blue-400" />
                <div className="flex-1">
                  <h4 className="font-medium text-white">{graph.name}</h4>
                  <p className="text-sm text-slate-400">{graph.nodeCount} entidades • {graph.edgeCount} relações</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(graph.updated_at).toLocaleDateString('pt-BR')}</div>
                  <span className={`text-xs px-2 py-0.5 rounded ${graph.source === 'manual' ? 'bg-slate-700' : 'bg-green-700'}`}>
                    {graph.source === 'manual' ? 'Manual' : graph.source}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

