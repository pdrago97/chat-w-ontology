import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getKnowledgeItemsByOrganization, KnowledgeItem } from '@/lib/knowledge';
import { Plus, FileText, Link as LinkIcon, MessageSquare, Wrench, BookOpen, Network, Clock } from 'lucide-react';
import { KnowledgeActions } from './knowledge-actions';

const typeIcons: Record<string, React.ElementType> = {
  text: FileText,
  document: FileText,
  url: LinkIcon,
  prompt: MessageSquare,
  instruction: BookOpen,
  tool: Wrench,
};

const typeLabels: Record<string, string> = {
  text: 'Texto',
  document: 'Documento',
  url: 'URL',
  prompt: 'Prompt',
  instruction: 'Instrução',
  tool: 'Ferramenta',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500 animate-pulse',
  indexed: 'bg-green-500',
  failed: 'bg-red-500',
};

export default async function KnowledgePage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getKnowledgeItemsByOrganization(session.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-slate-400 mt-1">Gerencie o conhecimento dos seus agentes</p>
        </div>
        <div className="flex gap-3">
          <Link href="/knowledge/central"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            <Network className="w-4 h-4" /> Central de Conhecimento
          </Link>
          <Link href="/knowledge/graph"
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
            <Network className="w-4 h-4" /> Explorar Grafo
          </Link>
          <Link href="/knowledge/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Adicionar Conhecimento
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: items.length, color: 'blue' },
          { label: 'Indexados', value: items.filter(i => i.status === 'indexed').length, color: 'green' },
          { label: 'Pendentes', value: items.filter(i => i.status === 'pending').length, color: 'yellow' },
          { label: 'Falhos', value: items.filter(i => i.status === 'failed').length, color: 'red' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum conhecimento cadastrado</h3>
          <p className="text-slate-400 mb-6">Adicione documentos, textos, prompts ou instruções para seus agentes.</p>
          <Link href="/knowledge/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Adicionar Primeiro Item
          </Link>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Título</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Tipo</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Tags</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Criado</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const Icon = typeIcons[item.content_type] || FileText;
                return (
                  <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/knowledge/${item.id}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{item.title}</p>
                          <p className="text-sm text-slate-500 truncate max-w-xs">
                            {item.content ? item.content.substring(0, 60) + '...' : 'Sem conteúdo'}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300 text-sm">{typeLabels[item.content_type]}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusColors[item.status]}`} />
                        <span className="text-slate-300 text-sm capitalize">{item.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {item.tags.length > 0 ? item.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                            {tag}
                          </span>
                        )) : <span className="text-slate-500 text-sm">Nenhuma</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Clock className="w-4 h-4" />
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <KnowledgeActions item={item} />
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

