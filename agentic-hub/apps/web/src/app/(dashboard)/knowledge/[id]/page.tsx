'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Network, RefreshCw, Check, AlertCircle, Eye, Trash2 } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  content_type: string;
  status: string;
  file_name?: string;
  file_size?: number;
  tags: string[];
  created_at: string;
  indexed_at?: string;
}

interface Graph {
  id: string;
  name: string;
  graph: { nodes: unknown[]; edges: unknown[] };
}

export default function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/knowledge/${resolvedParams.id}`).then(r => r.json()),
      fetch(`/api/knowledge/${resolvedParams.id}/graph`).then(r => r.json()),
    ]).then(([itemData, graphData]) => {
      setItem(itemData.item || itemData);
      setGraph(graphData.graph);
    }).finally(() => setLoading(false));
  }, [resolvedParams.id]);

  async function generateGraph() {
    setGenerating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/knowledge/${resolvedParams.id}/graph`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: `Grafo gerado! ${data.stats.entities} entidades, ${data.stats.relations} relações` });
      setGraph({ id: data.graphId, name: `Grafo: ${item?.title}`, graph: data.graph });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao gerar grafo' });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-slate-400">Carregando...</div>;
  if (!item) return <div className="text-center py-12 text-red-400">Item não encontrado</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/knowledge" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{item.title}</h1>
          <p className="text-slate-400">Tipo: {item.content_type} • Status: {item.status}</p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/10 border border-green-500/50 text-green-400' 
          : 'bg-red-500/10 border border-red-500/50 text-red-400'}`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Graph Section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-400" /> Grafo de Conhecimento
          </h3>
          <div className="flex gap-2">
            {graph && (
              <Link href={`/knowledge/graph?highlight=${graph.id}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
                <Eye className="w-4 h-4" /> Visualizar
              </Link>
            )}
            <button onClick={generateGraph} disabled={generating}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm rounded-lg">
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {graph ? 'Regenerar Grafo' : 'Gerar Grafo'}
            </button>
          </div>
        </div>

        {graph ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400">Entidades</p>
                <p className="text-2xl font-bold text-blue-400">{graph.graph?.nodes?.length || 0}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400">Relações</p>
                <p className="text-2xl font-bold text-green-400">{graph.graph?.edges?.length || 0}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              Grafo ID: <code className="text-slate-300">{graph.id}</code>
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum grafo gerado ainda</p>
            <p className="text-sm">Clique em "Gerar Grafo" para extrair entidades e relações deste documento</p>
          </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" /> Conteúdo
        </h3>
        <div className="bg-slate-900/50 rounded-lg p-4 max-h-96 overflow-auto">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{item.content}</pre>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Metadados</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {item.file_name && <><dt className="text-slate-400">Arquivo</dt><dd className="text-white">{item.file_name}</dd></>}
          {item.file_size && <><dt className="text-slate-400">Tamanho</dt><dd className="text-white">{(item.file_size / 1024).toFixed(1)} KB</dd></>}
          <dt className="text-slate-400">Criado em</dt><dd className="text-white">{new Date(item.created_at).toLocaleString('pt-BR')}</dd>
          {item.indexed_at && <><dt className="text-slate-400">Indexado em</dt><dd className="text-white">{new Date(item.indexed_at).toLocaleString('pt-BR')}</dd></>}
          <dt className="text-slate-400">Tags</dt><dd className="text-white">{item.tags?.length ? item.tags.join(', ') : 'Nenhuma'}</dd>
        </dl>
      </div>
    </div>
  );
}

