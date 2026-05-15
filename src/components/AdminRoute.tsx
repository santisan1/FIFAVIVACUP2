import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return <ProtectedRoute>{profile?.role === 'admin' ? children : <div className="p-6"><h1 className="text-2xl font-black">Solo admins</h1><p className="text-slate-400">Esta zona controla torneos, jugadores e invites.</p></div>}</ProtectedRoute>;
}
