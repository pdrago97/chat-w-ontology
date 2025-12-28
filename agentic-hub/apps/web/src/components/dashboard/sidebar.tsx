'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Bot, 
  MessageSquare, 
  Database, 
  Settings,
  Users,
  BarChart3,
  Plug
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/lib/auth';

interface SidebarProps {
  user: SessionUser;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agentes', href: '/agents', icon: Bot },
  { name: 'Conversas', href: '/conversations', icon: MessageSquare },
  { name: 'Knowledge Base', href: '/knowledge', icon: Database },
  { name: 'Canais', href: '/channels', icon: Plug },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Equipe', href: '/team', icon: Users },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <span className="font-bold text-white">Agentic Hub</span>
        </Link>
      </div>

      {/* Organization */}
      <div className="px-4 py-3 border-b border-slate-700">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Organização</p>
        <p className="text-sm font-medium text-white truncate mt-1">
          {user.organizationSlug}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

