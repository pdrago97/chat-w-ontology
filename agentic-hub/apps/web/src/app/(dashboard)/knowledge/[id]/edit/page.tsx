'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  content_type: string;
  tags: string[];
  status: string;
}

export default function EditKnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    async function fetchItem() {
      try {
        const res = await fetch(`/api/knowledge/${resolvedParams.id}`);
        if (res.ok) {
          const data = await res.json();
          setItem(data.item);
          setTitle(data.item.title);
          setContent(data.item.content || '');
          setTags(data.item.tags?.join(', ') || '');
        }
      } catch (error) {
        console.error('Error fetching item:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [resolvedParams.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/knowledge/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        router.push(`/knowledge/${resolvedParams.id}`);
        router.refresh();
      } else {
        alert('Erro ao salvar');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Conhecimento não encontrado</p>
        <Link href="/knowledge" className="text-blue-400 hover:underline mt-2 inline-block">
          Voltar para lista
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={`/knowledge/${resolvedParams.id}`}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Conhecimento</h1>
          <p className="text-slate-400 text-sm">Edite as informações do item</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white"
            placeholder="Título do conhecimento"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Conteúdo</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none"
            placeholder="Conteúdo do conhecimento..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Tags (separadas por vírgula)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white"
            placeholder="ex: produto, faq, suporte"
          />
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Link href={`/knowledge/${resolvedParams.id}`}
            className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors">
            Cancelar
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

