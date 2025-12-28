import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getAgentById } from '@/lib/agents';
import { ArrowLeft, Bot, Settings } from 'lucide-react';
import { ChatInterface } from './chat-interface';

type Props = { params: Promise<{ id: string }> };

export default async function AgentChatPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const agent = await getAgentById(id, session.organizationId);
  
  if (!agent) notFound();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <Link href={`/agents/${id}`} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="font-bold text-white">{agent.name}</h1>
              <p className="text-xs text-slate-400">Modo de Teste</p>
            </div>
          </div>
        </div>
        <Link href={`/agents/${id}`} className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white text-sm">
          <Settings className="w-4 h-4" /> Configurar
        </Link>
      </div>

      {/* Chat */}
      <ChatInterface agent={agent} />
    </div>
  );
}

