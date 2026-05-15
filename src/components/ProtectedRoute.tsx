import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from './Router';
import { LoadingScreen } from './LoadingScreen';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, profile } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!profile) return <div className="mx-auto max-w-md p-6 text-center"><h1 className="text-2xl font-black">Necesitás tu link privado</h1><p className="mt-2 text-slate-400">Entrá desde el invite que te mandaron por WhatsApp.</p><Link className="btn btn-primary mt-5" to="/">Volver al home</Link></div>;
  return children;
}
