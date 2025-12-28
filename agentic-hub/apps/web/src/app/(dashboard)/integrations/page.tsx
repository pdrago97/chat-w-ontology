'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Database, Globe, Webhook, Cloud, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  provider: string | null;
  status: string;
  sync_frequency: string;
  last_sync_at: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Database> = {
  airweave: Cloud,
  api: Globe,
  database: Database,
  webhook: Webhook,
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  connected: { color: 'text-green-400', icon: CheckCircle },
  syncing: { color: 'text-blue-400', icon: RefreshCw },
  error: { color: 'text-red-400', icon: AlertCircle },
  pending: { color: 'text-yellow-400', icon: Clock },
  disabled: { color: 'text-slate-500', icon: AlertCircle },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.json())
      .then(data => setIntegrations(data.integrations || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrações</h1>
          <p className="text-slate-400">Conecte fontes externas de dados</p>
        </div>
        <Link href="/integrations/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          <Plus className="w-4 h-4" /> Nova Integração
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : integrations.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Cloud className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Nenhuma integração configurada</h3>
          <p className="text-slate-400 mb-6">Conecte APIs, bancos de dados ou use Airweave para sincronizar dados externos</p>
          <Link href="/integrations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <Plus className="w-4 h-4" /> Adicionar Integração
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {integrations.map(integration => {
            const TypeIcon = typeIcons[integration.source_type] || Globe;
            const status = statusConfig[integration.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <div key={integration.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <TypeIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                      <p className="text-sm text-slate-400">{integration.description || integration.provider || integration.source_type}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className={`flex items-center gap-1 ${status.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {integration.status}
                        </span>
                        <span className="text-slate-500">
                          Sync: {integration.sync_frequency}
                        </span>
                        {integration.last_sync_at && (
                          <span className="text-slate-500">
                            Último: {new Date(integration.last_sync_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provider Categories */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Conectores Disponíveis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { icon: '📝', name: 'Notion' },
            { icon: '📁', name: 'Google Drive' },
            { icon: '💬', name: 'Slack' },
            { icon: '🐘', name: 'PostgreSQL' },
            { icon: '☁️', name: 'Salesforce' },
            { icon: '🐙', name: 'GitHub' },
            { icon: '📚', name: 'Confluence' },
            { icon: '🎫', name: 'Jira' },
            { icon: '🧲', name: 'HubSpot' },
            { icon: '🎧', name: 'Zendesk' },
            { icon: '📊', name: 'Airtable' },
            { icon: '🍃', name: 'MongoDB' },
          ].map(p => (
            <div key={p.name} className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg text-sm text-slate-300">
              <span className="text-lg">{p.icon}</span> {p.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

