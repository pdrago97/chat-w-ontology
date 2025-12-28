'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Globe, Info } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  status: string;
}

export default function NewChannelPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [formData, setFormData] = useState({
    type: 'whatsapp',
    name: '',
    agentId: '',
    instanceId: '',
    apiKey: '',
    baseUrl: 'https://api.uazapi.com',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(data => setAgents(data.agents || []));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          name: formData.name,
          agentId: formData.agentId || null,
          credentials: formData.type === 'whatsapp' ? {
            instance_id: formData.instanceId,
            api_key: formData.apiKey,
            base_url: formData.baseUrl,
          } : {},
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar canal');
        return;
      }
      router.push(`/channels/${data.channel.id}`);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/channels" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Canal</h1>
          <p className="text-slate-400">Configure uma nova integração</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Canal</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
              { type: 'website', label: 'Website', icon: Globe },
            ].map(({ type, label, icon: Icon }) => (
              <button key={type} type="button" onClick={() => setFormData(p => ({ ...p, type }))}
                className={`p-4 rounded-lg border flex items-center gap-3 ${
                  formData.type === type ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'
                }`}>
                <Icon className={`w-6 h-6 ${formData.type === type ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="text-white">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Nome *</label>
          <input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: WhatsApp Principal" required />
        </div>

        <div>
          <label htmlFor="agentId" className="block text-sm font-medium text-slate-300 mb-1">Agente Responsável</label>
          <select id="agentId" name="agentId" value={formData.agentId} onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Selecione um agente</option>
            {agents.filter(a => a.status === 'active').map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {formData.type === 'whatsapp' && (
          <div className="space-y-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 text-blue-400">
              <Info className="w-4 h-4" />
              <span className="text-sm">Credenciais UAZAPI</span>
            </div>
            <div>
              <label htmlFor="instanceId" className="block text-sm font-medium text-slate-300 mb-1">Instance ID *</label>
              <input id="instanceId" name="instanceId" type="text" value={formData.instanceId} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sua-instance-id" required />
            </div>
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-1">API Key *</label>
              <input id="apiKey" name="apiKey" type="password" value={formData.apiKey} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sua-api-key" required />
            </div>
            <div>
              <label htmlFor="baseUrl" className="block text-sm font-medium text-slate-300 mb-1">Base URL</label>
              <input id="baseUrl" name="baseUrl" type="text" value={formData.baseUrl} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Link href="/channels" className="px-4 py-2 text-slate-300 hover:text-white">Cancelar</Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors">
            {loading ? 'Criando...' : 'Criar Canal'}
          </button>
        </div>
      </form>
    </div>
  );
}

