import { Monitor, Shield, Trophy } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';

export function AppShell({ children }) {
  const { pathname } = useLocation();
  const currentYear = new Date().getFullYear();
  const playerMode = pathname.startsWith('/player/');
  const adminMode = pathname.startsWith('/admin');
  const publicMode = pathname.startsWith('/tournament/') || pathname.startsWith('/screen/') || pathname.startsWith('/tv/');
  const mode = adminMode ? 'ADMIN MODE' : playerMode ? 'PLAYER MAGIC LINK MODE' : publicMode ? 'PUBLIC TOURNAMENT MODE' : 'VIVA CUP';
  return (
    <div className="min-h-screen overflow-hidden bg-night text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,.28),transparent_28rem),radial-gradient(circle_at_85%_12%,rgba(139,92,246,.25),transparent_24rem),linear-gradient(180deg,#070A12,#0B1020_45%,#05070d)]" />
      <div className="fixed inset-x-0 bottom-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,.18),transparent_65%)]" />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-night/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3 font-black tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-electric to-violet shadow-glow"><Trophy className="h-5 w-5" /></span>
            <span className="hidden sm:inline">FIFA Viva Cup</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[.2em] text-slate-300">{mode}</span>
          </Link>
          <nav className="flex items-center gap-2 text-xs md:text-sm">
            {!playerMode && <NavLink to={`/season/${currentYear}`} className="btn btn-ghost px-3 py-2">Ranking</NavLink>}
            {publicMode && !pathname.startsWith('/tv/') && <NavLink to={pathname.replace('/tournament/', '/tv/').replace('/screen/', '/tv/')} className="btn btn-ghost px-3 py-2"><Monitor className="h-4 w-4" /> Pantalla</NavLink>}
            {!playerMode && <NavLink to="/admin" className="btn btn-ghost px-3 py-2 opacity-70 hover:opacity-100"><Shield className="h-4 w-4" /> Admin</NavLink>}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}
