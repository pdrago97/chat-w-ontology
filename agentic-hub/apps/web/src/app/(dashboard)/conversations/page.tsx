import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getConversationsByOrganization } from '@/lib/conversations';
import { getAgentsByOrganization } from '@/lib/agents';
import { MessageSquare, User, Bot, Clock, Phone, Globe, Mail } from 'lucide-react';

const channelIcons: Record<string, React.ElementType> = {
  whatsapp: Phone,
  website: Globe,
  email: Mail,
  api: MessageSquare,
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativa', color: 'bg-green-500' },
  ended: { label: 'Encerrada', color: 'bg-slate-500' },
  handoff: { label: 'Aguardando Humano', color: 'bg-yellow-500' },
};

function formatTime(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  
  if (diff < 60000) return 'Agora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString('pt-BR');
}

export default async function ConversationsPage() {
  const session = await getSession();
  if (!session) return null;

  const [conversations, agents] = await Promise.all([
    getConversationsByOrganization(session.organizationId, { limit: 50 }),
    getAgentsByOrganization(session.organizationId),
  ]);

  const agentMap = new Map(agents.map(a => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Conversas</h1>
        <p className="text-slate-400 mt-1">Visualize todas as conversas dos seus agentes</p>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <MessageSquare className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhuma conversa ainda</h3>
          <p className="text-slate-400">As conversas aparecerão aqui quando seus agentes receberem mensagens.</p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Agente</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Canal</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Última Atividade</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((conv) => {
                const ChannelIcon = channelIcons[conv.channel] || MessageSquare;
                const status = statusLabels[conv.status] || statusLabels.active;
                const customerName = conv.customer?.name || conv.customer?.phone || 'Cliente';

                return (
                  <tr key={conv.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/conversations/${conv.id}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{customerName}</p>
                          {conv.customer?.phone && (
                            <p className="text-sm text-slate-500">{conv.customer.phone}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-300">{agentMap.get(conv.agent_id) || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ChannelIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300 capitalize">{conv.channel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${status.color}`} />
                        <span className="text-slate-300 text-sm">{status.label}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Clock className="w-4 h-4" />
                        {formatTime(conv.started_at)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

