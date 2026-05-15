import { LogOut, Shield, Trophy, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { logout } from '../lib/auth';
import { Link } from './Router';

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return <div className="min-h-screen"><header className="sticky top-0 z-20 border-b border-white/10 bg-night/80 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3"><Link to="/" className="flex items-center gap-2 font-black"><Trophy className="h-5 w-5 text-electric" /> Viva Cup</Link><nav className="flex items-center gap-2 text-sm"><Link to="/live" className="btn btn-ghost px-3 py-2">Live</Link>{profile && <Link to="/me" className="btn btn-ghost px-3 py-2"><User className="h-4 w-4" /></Link>}{profile?.role === 'admin' && <Link to="/admin" className="btn btn-ghost px-3 py-2"><Shield className="h-4 w-4" /></Link>}{profile && <button className="btn btn-ghost px-3 py-2" onClick={() => void logout()}><LogOut className="h-4 w-4" /></button>}</nav></div></header><main className="mx-auto max-w-7xl px-4 py-6 md:py-10">{children}</main></div>;
}
