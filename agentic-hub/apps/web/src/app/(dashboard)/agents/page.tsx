import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getAgentsByOrganization } from '@/lib/agents';
import { Bot, Plus, MoreHorizontal, MessageSquare, Settings } from 'lucide-react';

const statusColors = {
  draft: 'bg-slate-500',
  training: 'bg-yellow-500',
  active: 'bg-green-500',
  paused: 'bg-orange-500',
};

const statusLabels = {
  draft: 'Rascunho',
  training: 'Treinando',
  active: 'Ativo',
  paused: 'Pausado',
};

export default async function AgentsPage() {
  const session = await getSession();
  if (!session) return null;

  const agents = await getAgentsByOrganization(session.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes</h1>
          <p className="text-slate-400 mt-1">
            Gerencie seus agentes de IA
          </p>
        </div>
        <Link
          href="/agents/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Agente
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Bot className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum agente ainda</h3>
          <p className="text-slate-400 mb-6">
            Crie seu primeiro agente de IA para começar a automatizar conversas.
          </p>
          <Link
            href="/agents/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Agente
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{agent.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                      <span className="text-xs text-slate-400">{statusLabels[agent.status]}</span>
                    </div>
                  </div>
                </div>
                <button className="p-1 text-slate-400 hover:text-white">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                {agent.description || 'Sem descrição'}
              </p>

              <div className="flex items-center gap-2">
                <Link
                  href={`/agents/${agent.id}/chat`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Testar
                </Link>
                <Link
                  href={`/agents/${agent.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configurar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

