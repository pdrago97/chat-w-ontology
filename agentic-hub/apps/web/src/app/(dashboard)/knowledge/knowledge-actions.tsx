'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  content_type: string;
}

export function KnowledgeActions({ item }: { item: KnowledgeItem }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/knowledge/${item.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Erro ao excluir conhecimento');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Erro ao excluir conhecimento');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => router.push(`/knowledge/${item.id}/edit`)}
        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        title="Editar"
      >
        <Pencil className="w-4 h-4 text-slate-400 hover:text-blue-400" />
      </button>
      <button
        onClick={() => setShowConfirm(true)}
        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        title="Excluir"
      >
        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
      </button>

      {/* Modal de confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Confirmar exclusão
            </h3>
            <p className="text-slate-400 mb-6">
              Tem certeza que deseja excluir &quot;{item.title}&quot;? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

