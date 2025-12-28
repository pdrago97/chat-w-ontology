'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Cloud, Globe, Database, Webhook, Check } from 'lucide-react';

const sourceTypes = [
  { type: 'airweave', label: 'Airweave', icon: Cloud, description: 'Conecte apps como Notion, Slack, Google Drive' },
  { type: 'api', label: 'API REST', icon: Globe, description: 'Conecte qualquer API REST externa' },
  { type: 'database', label: 'Banco de Dados', icon: Database, description: 'PostgreSQL, MySQL, MongoDB' },
  { type: 'webhook', label: 'Webhook', icon: Webhook, description: 'Receba dados via webhook' },
];

const providers = [
  { id: 'notion', name: 'Notion', icon: '📝', category: 'productivity' },
  { id: 'google_drive', name: 'Google Drive', icon: '📁', category: 'storage' },
  { id: 'slack', name: 'Slack', icon: '💬', category: 'communication' },
  { id: 'confluence', name: 'Confluence', icon: '📚', category: 'documentation' },
  { id: 'jira', name: 'Jira', icon: '🎫', category: 'project_management' },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️', category: 'crm' },
  { id: 'hubspot', name: 'HubSpot', icon: '🧲', category: 'crm' },
  { id: 'postgresql', name: 'PostgreSQL', icon: '🐘', category: 'database' },
  { id: 'mysql', name: 'MySQL', icon: '🐬', category: 'database' },
  { id: 'mongodb', name: 'MongoDB', icon: '🍃', category: 'database' },
  { id: 'github', name: 'GitHub', icon: '🐙', category: 'development' },
  { id: 'zendesk', name: 'Zendesk', icon: '🎧', category: 'support' },
];

export default function NewIntegrationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    sourceType: '',
    provider: '',
    name: '',
    description: '',
    syncFrequency: 'daily',
    credentials: {} as Record<string, string>,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar integração');
        return;
      }

      router.push('/integrations');
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/integrations" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nova Integração</h1>
          <p className="text-slate-400">Conecte uma fonte externa de dados</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Step 1: Select Type */}
      {step === 1 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tipo de Integração</h3>
          <div className="grid grid-cols-2 gap-4">
            {sourceTypes.map(({ type, label, icon: Icon, description }) => (
              <button key={type} onClick={() => { setFormData(p => ({ ...p, sourceType: type })); setStep(2); }}
                className="p-4 rounded-lg border border-slate-600 hover:border-blue-500 hover:bg-blue-500/10 text-left transition-colors">
                <Icon className="w-8 h-8 text-blue-400 mb-2" />
                <p className="font-medium text-white">{label}</p>
                <p className="text-sm text-slate-400">{description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Provider (for Airweave) or Configure */}
      {step === 2 && formData.sourceType === 'airweave' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Selecione o Provedor</h3>
          <div className="grid grid-cols-3 gap-3">
            {providers.map(p => (
              <button key={p.id} onClick={() => { 
                setFormData(prev => ({ ...prev, provider: p.id, name: p.name })); 
                setStep(3); 
              }}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  formData.provider === p.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'
                }`}>
                <span className="text-2xl">{p.icon}</span>
                <p className="font-medium text-white mt-1">{p.name}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="mt-4 text-slate-400 hover:text-white">← Voltar</button>
        </div>
      )}

      {/* Step 2 for non-Airweave: Direct config */}
      {step === 2 && formData.sourceType !== 'airweave' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Configurar {sourceTypes.find(s => s.type === formData.sourceType)?.label}</h3>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nome *</label>
            <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white" placeholder="Minha API" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
            <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-300 hover:text-white">Voltar</button>
            <button onClick={handleSubmit} disabled={loading || !formData.name}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg">
              {loading ? 'Criando...' : 'Criar Integração'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Final config for Airweave */}
      {step === 3 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{providers.find(p => p.id === formData.provider)?.icon}</span>
            <h3 className="text-lg font-semibold text-white">Configurar {formData.name}</h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nome da Integração</label>
            <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Frequência de Sync</label>
            <select value={formData.syncFrequency} onChange={e => setFormData(p => ({ ...p, syncFrequency: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
              <option value="realtime">Tempo Real</option>
              <option value="hourly">A cada hora</option>
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <p className="text-sm text-slate-400 bg-slate-700/30 p-3 rounded-lg">
            <Check className="w-4 h-4 inline mr-1 text-green-400" />
            Após criar, você será redirecionado para autenticar com {formData.name}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-slate-300 hover:text-white">Voltar</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg">
              {loading ? 'Criando...' : 'Criar e Conectar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

