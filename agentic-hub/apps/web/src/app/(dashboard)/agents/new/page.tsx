'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bot } from 'lucide-react';

export default function NewAgentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tone: 'professional',
    language: 'pt-BR',
    instructions: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
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

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar agente');
        return;
      }

      router.push(`/agents/${data.agent.id}`);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/agents" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Agente</h1>
          <p className="text-slate-400">Configure seu novo agente de IA</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 pb-6 border-b border-slate-700">
          <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Bot className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Avatar</p>
            <button type="button" className="text-sm text-blue-400 hover:text-blue-300">
              Alterar imagem
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Nome do Agente *</label>
          <input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Assistente de Vendas" required />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={2}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Breve descrição do agente" />
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
          <textarea id="instructions" name="instructions" value={formData.instructions} onChange={handleChange} rows={4}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Instruções específicas para o comportamento do agente..." />
        </div>

        <div className="flex gap-3 pt-4">
          <Link href="/agents" className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancelar</Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors">
            {loading ? 'Criando...' : 'Criar Agente'}
          </button>
        </div>
      </form>
    </div>
  );
}

