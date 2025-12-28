import Link from "next/link";
import { ArrowRight, Bot, Network, MessageSquare, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold text-white">Agentic Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Começar Grátis
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Agentes Inteligentes com{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-500">
              Knowledge Graphs
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Crie agentes conversacionais alimentados por grafos de conhecimento
            3D interativos. Integre com WhatsApp, Website e muito mais.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              Criar Primeiro Agente
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/demo"
              className="border border-slate-600 hover:border-slate-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Ver Demo
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="bg-primary-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-primary-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Agentes Personalizados
            </h3>
            <p className="text-slate-400">
              Crie agentes com personalidade única, treinados com seus documentos
              e conhecimento específico do seu negócio.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="bg-accent-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Network className="h-6 w-6 text-accent-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Grafos 3D Interativos
            </h3>
            <p className="text-slate-400">
              Visualize e navegue pelo conhecimento em grafos 3D. Entenda conexões
              e explore dados de forma intuitiva.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="bg-green-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Multi-Canal
            </h3>
            <p className="text-slate-400">
              Integre com WhatsApp, Website, Email e mais. Gerencie todas as
              conversas em um único inbox unificado.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-slate-800">
        <div className="flex items-center justify-between text-slate-500 text-sm">
          <p>© 2024 Agentic Hub. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            <span>Powered by PDR Systems</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

