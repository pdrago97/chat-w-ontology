'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Agent } from '@/lib/agents';

interface Props {
  agent: Agent;
}

export function AgentConfigForm({ agent }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: agent.name,
    description: agent.description || '',
    tone: agent.persona?.tone || 'professional',
    language: agent.persona?.language || 'pt-BR',
    instructions: agent.persona?.instructions || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setMessage('');
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          persona: {
            tone: formData.tone,
            language: formData.language,
            instructions: formData.instructions,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || 'Erro ao salvar');
        return;
      }

      setMessage('Salvo com sucesso!');
      router.refresh();
    } catch {
      setMessage('Erro de conexão');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
          className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
        <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={2}
          className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tone" className="block text-sm font-medium text-slate-300 mb-1">Tom</label>
          <select id="tone" name="tone" value={formData.tone} onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="professional">Profissional</option>
            <option value="friendly">Amigável</option>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
          </select>
        </div>
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-slate-300 mb-1">Idioma</label>
          <select id="language" name="language" value={formData.language} onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="pt-BR">Português (BR)</option>
            <option value="en-US">English (US)</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-slate-300 mb-1">Instruções do Sistema</label>
        <textarea id="instructions" name="instructions" value={formData.instructions} onChange={handleChange} rows={6}
          className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Instruções específicas para o comportamento do agente..." />
        <p className="text-xs text-slate-500 mt-1">Estas instruções definem como o agente deve se comportar.</p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        {message && (
          <p className={`text-sm ${message.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
        )}
        <button onClick={handleSave} disabled={saving}
          className="ml-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors">
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}

