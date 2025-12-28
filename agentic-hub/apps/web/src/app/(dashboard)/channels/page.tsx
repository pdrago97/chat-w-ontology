import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getChannelsByOrganization } from '@/lib/channels';
import { getAgentsByOrganization } from '@/lib/agents';
import { Plus, MessageSquare, Globe, Mail, Hash, Bot, Plug } from 'lucide-react';

const channelIcons: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  website: Globe,
  email: Mail,
  slack: Hash,
  telegram: Bot,
  api: Plug,
};

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  website: 'Website Widget',
  email: 'Email',
  slack: 'Slack',
  telegram: 'Telegram',
  api: 'API',
};

const statusColors = {
  connected: 'bg-green-500',
  disconnected: 'bg-slate-500',
  error: 'bg-red-500',
};

export default async function ChannelsPage() {
  const session = await getSession();
  if (!session) return null;

  const [channels, agents] = await Promise.all([
    getChannelsByOrganization(session.organizationId),
    getAgentsByOrganization(session.organizationId),
  ]);

  const agentMap = new Map(agents.map(a => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Canais</h1>
          <p className="text-slate-400 mt-1">Conecte seus agentes a diferentes plataformas</p>
        </div>
        <Link href="/channels/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Novo Canal
        </Link>
      </div>

      {channels.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Plug className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum canal configurado</h3>
          <p className="text-slate-400 mb-6">Conecte seu primeiro canal para receber mensagens.</p>
          <Link href="/channels/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Conectar Canal
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => {
            const Icon = channelIcons[channel.type] || Plug;
            return (
              <Link key={channel.id} href={`/channels/${channel.id}`}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{channel.name}</h3>
                      <p className="text-sm text-slate-400">{channelLabels[channel.type]}</p>
                    </div>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${statusColors[channel.status]}`} />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Bot className="w-4 h-4" />
                  {channel.agent_id ? agentMap.get(channel.agent_id) || 'Agente desconhecido' : 'Nenhum agente'}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Available Channels */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Canais Disponíveis</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(channelLabels).map(([type, label]) => {
            const Icon = channelIcons[type];
            const isAvailable = type === 'whatsapp' || type === 'website';
            return (
              <div key={type} className={`p-4 rounded-lg border ${
                isAvailable ? 'border-slate-600 hover:border-slate-500' : 'border-slate-700 opacity-50'
              }`}>
                <Icon className="w-8 h-8 text-slate-400 mb-2" />
                <p className="font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500">{isAvailable ? 'Disponível' : 'Em breve'}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

