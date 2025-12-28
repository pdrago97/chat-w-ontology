import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  // If already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🤖 Agentic Hub
          </h1>
          <p className="text-slate-400">
            Plataforma de Agentes Conversacionais
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

