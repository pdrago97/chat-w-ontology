import { getSession } from '@/lib/auth';
import { Bot, MessageSquare, Users, Activity } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getSession();

  const stats = [
    { name: 'Agentes Ativos', value: '0', icon: Bot, color: 'text-blue-400' },
    { name: 'Conversas Hoje', value: '0', icon: MessageSquare, color: 'text-green-400' },
    { name: 'Usuários', value: '1', icon: Users, color: 'text-purple-400' },
    { name: 'Taxa de Resolução', value: '0%', icon: Activity, color: 'text-orange-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Olá, {session?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-slate-400 mt-1">
          Bem-vindo ao Agentic Hub. Aqui está um resumo da sua organização.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{stat.name}</p>
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-10 h-10 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Começar</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg hover:bg-blue-600/20 transition-colors text-left">
            <Bot className="w-8 h-8 text-blue-400" />
            <div>
              <p className="font-medium text-white">Criar Agente</p>
              <p className="text-sm text-slate-400">Configure seu primeiro agente IA</p>
            </div>
          </button>
          
          <button className="flex items-center gap-3 p-4 bg-purple-600/10 border border-purple-600/30 rounded-lg hover:bg-purple-600/20 transition-colors text-left">
            <Users className="w-8 h-8 text-purple-400" />
            <div>
              <p className="font-medium text-white">Convidar Equipe</p>
              <p className="text-sm text-slate-400">Adicione membros à organização</p>
            </div>
          </button>
          
          <button className="flex items-center gap-3 p-4 bg-green-600/10 border border-green-600/30 rounded-lg hover:bg-green-600/20 transition-colors text-left">
            <MessageSquare className="w-8 h-8 text-green-400" />
            <div>
              <p className="font-medium text-white">Conectar Canal</p>
              <p className="text-sm text-slate-400">WhatsApp, Website, Email...</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Atividade Recente</h2>
        <div className="text-center py-8 text-slate-500">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma atividade ainda</p>
          <p className="text-sm">Crie seu primeiro agente para começar</p>
        </div>
      </div>
    </div>
  );
}

