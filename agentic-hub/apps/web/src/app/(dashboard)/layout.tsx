import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="h-screen w-screen bg-slate-900 flex overflow-hidden">
      <Sidebar user={session} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={session} />
        <main className="flex-1 p-4 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

