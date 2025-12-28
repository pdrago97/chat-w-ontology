'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Link as LinkIcon, MessageSquare, Wrench, BookOpen, Plus, X, Upload, File } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
}

const contentTypes = [
  { type: 'text', label: 'Texto', icon: FileText, description: 'Texto livre com informações' },
  { type: 'document', label: 'Documento', icon: Upload, description: 'Upload PDF, Excel, Word, CSV' },
  { type: 'url', label: 'URL', icon: LinkIcon, description: 'Referência a uma página web' },
  { type: 'prompt', label: 'Prompt', icon: MessageSquare, description: 'Template de prompt para o agente' },
  { type: 'instruction', label: 'Instrução', icon: BookOpen, description: 'Instrução específica para o agente' },
  { type: 'tool', label: 'Ferramenta', icon: Wrench, description: 'Integração ou ferramenta externa' },
];

export default function NewKnowledgePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentType: 'text',
    agentId: '',
    sourceUrl: '',
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(data => setAgents(data.agents || []));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addTag() {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  }

  function removeTag(tag: string) {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^.]+$/, '') }));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Document upload
      if (formData.contentType === 'document' && selectedFile) {
        setUploadProgress('Enviando arquivo...');
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        uploadData.append('title', formData.title);
        if (formData.agentId) uploadData.append('agentId', formData.agentId);
        if (formData.tags.length) uploadData.append('tags', formData.tags.join(','));

        const res = await fetch('/api/knowledge/upload', {
          method: 'POST',
          body: uploadData,
        });

        setUploadProgress('Processando documento...');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erro ao enviar arquivo');
          return;
        }

        setUploadProgress(`Sucesso! ${data.chunks} chunks criados.`);
        setTimeout(() => router.push('/knowledge'), 1000);
        return;
      }

      // Text-based content
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar item');
        return;
      }

      router.push('/knowledge');
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/knowledge" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Adicionar Conhecimento</h1>
          <p className="text-slate-400">Crie um novo item de conhecimento para seus agentes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Content Type Selection */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <label className="block text-sm font-medium text-slate-300 mb-4">Tipo de Conteúdo</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {contentTypes.map(({ type, label, icon: Icon, description }) => (
              <button key={type} type="button" onClick={() => setFormData(p => ({ ...p, contentType: type }))}
                className={`p-4 rounded-lg border text-left ${formData.contentType === type ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'
                  }`}>
                <Icon className={`w-6 h-6 mb-2 ${formData.contentType === type ? 'text-blue-400' : 'text-slate-400'}`} />
                <p className="font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">Título *</label>
            <input id="title" name="title" type="text" value={formData.title} onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Política de Devolução" required />
          </div>

          {/* File Upload for Document type */}
          {formData.contentType === 'document' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Arquivo *</label>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden"
                accept=".pdf,.xlsx,.xls,.csv,.docx,.txt,.md" />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-colors"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <File className="w-8 h-8 text-blue-400" />
                    <div className="text-left">
                      <p className="text-white font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="p-1 hover:bg-slate-700 rounded"><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                    <p className="text-slate-300">Clique para selecionar ou arraste um arquivo</p>
                    <p className="text-sm text-slate-500 mt-1">PDF, Excel, Word, CSV, TXT (máx 10MB)</p>
                  </>
                )}
              </div>
              {uploadProgress && (
                <p className="text-sm text-blue-400 mt-2 animate-pulse">{uploadProgress}</p>
              )}
            </div>
          )}

          {/* Text content for non-document types */}
          {formData.contentType !== 'document' && (
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-slate-300 mb-1">Conteúdo *</label>
              <textarea id="content" name="content" value={formData.content} onChange={handleChange} rows={8}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o conteúdo aqui..." required />
            </div>
          )}

          {formData.contentType === 'url' && (
            <div>
              <label htmlFor="sourceUrl" className="block text-sm font-medium text-slate-300 mb-1">URL de Origem</label>
              <input id="sourceUrl" name="sourceUrl" type="url" value={formData.sourceUrl} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..." />
            </div>
          )}

          <div>
            <label htmlFor="agentId" className="block text-sm font-medium text-slate-300 mb-1">Agente (opcional)</label>
            <select id="agentId" name="agentId" value={formData.agentId} onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Disponível para todos os agentes</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tags</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {formData.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Adicionar tag..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
              <button type="button" onClick={addTag} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/knowledge" className="px-4 py-2 text-slate-300 hover:text-white">Cancelar</Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg">
            {loading ? 'Salvando...' : 'Salvar Conhecimento'}
          </button>
        </div>
      </form>
    </div>
  );
}

