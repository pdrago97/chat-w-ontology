import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getAgentById } from '@/lib/agents';
import { ArrowLeft, Bot, MessageSquare, Database, Plug, Settings, Play, Pause } from 'lucide-react';
import { AgentConfigForm } from './agent-config-form';

type Props = { params: Promise<{ id: string }> };

export default async function AgentDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const agent = await getAgentById(id, session.organizationId);
  
  if (!agent) notFound();

  const statusColors = {
    draft: 'bg-slate-500',
    training: 'bg-yellow-500',
    active: 'bg-green-500',
    paused: 'bg-orange-500',
  };

  const tabs = [
    { name: 'Configurações', href: `/agents/${id}`, icon: Settings, active: true },
    { name: 'Knowledge Base', href: `/agents/${id}/knowledge`, icon: Database },
    { name: 'Canais', href: `/agents/${id}/channels`, icon: Plug },
    { name: 'Testar', href: `/agents/${id}/chat`, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agents" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{agent.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                <span className="text-sm text-slate-400 capitalize">{agent.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {agent.status === 'active' ? (
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 rounded-lg transition-colors">
              <Pause className="w-4 h-4" /> Pausar
            </button>
          ) : (
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg transition-colors">
              <Play className="w-4 h-4" /> Ativar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <Link key={tab.name} href={tab.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab.active
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Content */}
      <AgentConfigForm agent={agent} />
    </div>
  );
}

