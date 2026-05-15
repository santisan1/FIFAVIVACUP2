import type { ReactNode } from 'react';
import { Link } from './Router';
export function AdminLayout({ children }: { children: ReactNode }) { return <div className="space-y-6"><div className="glass flex flex-wrap gap-2 rounded-3xl p-3"><Link className="btn btn-ghost" to="/admin">Dashboard</Link><Link className="btn btn-ghost" to="/admin/players">Jugadores</Link><Link className="btn btn-ghost" to="/admin/tournaments">Torneos</Link></div>{children}</div>; }
