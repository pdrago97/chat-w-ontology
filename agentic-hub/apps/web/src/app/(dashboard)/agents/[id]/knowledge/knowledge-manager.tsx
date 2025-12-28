'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Brain, FileText, Link as LinkIcon, Network, Check, Square, CheckSquare, Loader2 } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  content_type: string;
  status: string;
  access_type?: string;
  enabled?: boolean;
  associated_at?: string;
}

interface Props {
  agentId: string;
  organizationId: string;
}

export function AgentKnowledgeManager({ agentId }: Props) {
  const [associatedItems, setAssociatedItems] = useState<KnowledgeItem[]>([]);
  const [availableItems, setAvailableItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [agentId]);

  async function loadData() {
    setLoading(true);
    try {
      const [assocRes, allRes] = await Promise.all([
        fetch(`/api/agents/${agentId}/knowledge`),
        fetch('/api/knowledge')
      ]);

      const assocData = await assocRes.json();
      const allData = await allRes.json();

      setAssociatedItems(assocData.items || []);

      // Filter out already associated items
      const associatedIds = new Set((assocData.items || []).map((i: KnowledgeItem) => i.id));
      setAvailableItems((allData.items || []).filter((i: KnowledgeItem) => !associatedIds.has(i.id)));
    } catch (err) {
      console.error('Error loading knowledge:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectToAdd(itemId: string) {
    const newSet = new Set(selectedToAdd);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedToAdd(newSet);
  }

  async function addSelectedKnowledge() {
    if (selectedToAdd.size === 0) return;
    setAdding(true);
    try {
      // Add all selected items
      const promises = Array.from(selectedToAdd).map(itemId =>
        fetch(`/api/agents/${agentId}/knowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ knowledgeItemId: itemId })
        })
      );
      await Promise.all(promises);
      await loadData();
      setSelectedToAdd(new Set());
      setShowAddModal(false);
    } finally {
      setAdding(false);
    }
  }

  async function removeKnowledge(itemId: string) {
    setRemoving(itemId);
    try {
      const res = await fetch(`/api/agents/${agentId}/knowledge?knowledgeItemId=${itemId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadData();
      }
    } finally {
      setRemoving(null);
    }
  }

  const typeIcons: Record<string, typeof FileText> = {
    text: FileText,
    link: LinkIcon,
    document: FileText,
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Base de Conhecimento do Agente
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Conhecimentos que este agente pode acessar para responder perguntas
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Adicionar Conhecimento
        </button>
      </div>

      {/* Associated Items */}
      {associatedItems.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-12 text-center">
          <Network className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">Nenhum conhecimento associado</h3>
          <p className="text-slate-500 mb-4">Adicione conhecimentos para que o agente possa usá-los nas respostas</p>
          <button onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors">
            <Plus className="w-4 h-4 inline mr-2" /> Adicionar Primeiro Conhecimento
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {associatedItems.map((item) => {
            const Icon = typeIcons[item.content_type] || FileText;
            return (
              <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.content_type}</p>
                </div>
                <span className="px-2 py-1 text-xs rounded bg-green-600/20 text-green-400">Ativo</span>
                <button onClick={() => removeKnowledge(item.id)} disabled={removing === item.id}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors">
                  {removing === item.id ? '...' : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white">Adicionar Conhecimento</h3>
                <p className="text-sm text-slate-400 mt-1">Selecione os conhecimentos para vincular ao agente</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setSelectedToAdd(new Set()); }}
                className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg">✕</button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {availableItems.length === 0 ? (
                <div className="text-center py-8">
                  <Network className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">Todos os conhecimentos já estão associados a este agente</p>
                  <a href="/knowledge" className="text-blue-400 hover:underline">Criar novo conhecimento →</a>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Select All */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
                    <button onClick={() => {
                      if (selectedToAdd.size === availableItems.length) {
                        setSelectedToAdd(new Set());
                      } else {
                        setSelectedToAdd(new Set(availableItems.map(i => i.id)));
                      }
                    }} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                      {selectedToAdd.size === availableItems.length ?
                        <CheckSquare className="w-4 h-4 text-blue-400" /> :
                        <Square className="w-4 h-4" />}
                      Selecionar todos ({availableItems.length})
                    </button>
                    {selectedToAdd.size > 0 && (
                      <span className="text-sm text-blue-400">{selectedToAdd.size} selecionado(s)</span>
                    )}
                  </div>

                  {availableItems.map((item) => {
                    const Icon = typeIcons[item.content_type] || FileText;
                    const isSelected = selectedToAdd.has(item.id);
                    return (
                      <div key={item.id}
                        className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer border transition-colors
                          ${isSelected ? 'bg-blue-600/20 border-blue-600' : 'hover:bg-slate-700/50 border-transparent hover:border-slate-600'}`}
                        onClick={() => toggleSelectToAdd(item.id)}>
                        <button className="flex-shrink-0">
                          {isSelected ?
                            <CheckSquare className="w-5 h-5 text-blue-400" /> :
                            <Square className="w-5 h-5 text-slate-500" />}
                        </button>
                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{item.title}</h4>
                          <p className="text-sm text-slate-400">{item.content_type}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {availableItems.length > 0 && (
              <div className="p-4 border-t border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-800/50">
                <button onClick={() => { setShowAddModal(false); setSelectedToAdd(new Set()); }}
                  className="px-4 py-2 text-slate-400 hover:text-white">
                  Cancelar
                </button>
                <button onClick={addSelectedKnowledge} disabled={selectedToAdd.size === 0 || adding}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {adding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Adicionar {selectedToAdd.size > 0 ? `(${selectedToAdd.size})` : ''}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

