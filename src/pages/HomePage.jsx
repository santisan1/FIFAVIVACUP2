import { motion } from 'framer-motion';
import { ArrowRight, Crown, Shield, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveTournament } from '../lib/firestore';

export function HomePage() {
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void getActiveTournament().then(setActive).finally(() => setLoading(false)); }, []);
  const year = active?.season ?? new Date().getFullYear();
  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(56,189,248,.20),rgba(139,92,246,.12)),url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center p-6 shadow-card md:p-10">
        <div className="absolute inset-0 bg-night/70 backdrop-blur-[2px]" />
        <div className="relative max-w-3xl space-y-5">
          <p className="inline-flex rounded-full border border-electric/30 bg-electric/10 px-4 py-2 text-xs font-black uppercase tracking-[.3em] text-electric"><Sparkles className="mr-2 h-4 w-4" /> Broadcast deportivo para tu juntada</p>
          <h1 className="text-5xl font-black leading-none md:text-7xl">FIFA Viva Cup</h1>
          <p className="text-lg text-slate-200 md:text-xl">Bracket épico, resultados en segundos, ranking anual y perfiles por magic link sin login pesado.</p>
          <div className="flex flex-wrap gap-3">
            {active && <Link className="btn btn-primary" to={`/tournament/${active.id}`}>Ver torneo <ArrowRight className="h-4 w-4" /></Link>}
            <Link className="btn btn-ghost" to={`/season/${year}`}>Ranking anual</Link>
            <Link className="btn btn-ghost opacity-70" to="/admin"><Shield className="h-4 w-4" /> Admin</Link>
          </div>
        </div>
      </motion.section>

      {loading ? <div className="glass h-32 animate-pulse rounded-[2rem]" /> : active ? <section className="glass rounded-[2rem] p-5 shadow-card"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><Crown className="text-pending" /><div><p className="text-sm text-slate-400">Torneo activo</p><h2 className="text-2xl font-black">{active.name}</h2><p className="text-sm text-slate-400">{active.status} · temporada {active.season}</p></div></div><Link className="btn btn-primary" to={`/tournament/${active.id}`}>Entrar a la transmisión</Link></div></section> : <section className="glass rounded-[2rem] p-8 text-center shadow-card"><Trophy className="mx-auto h-10 w-10 text-electric" /><h2 className="mt-3 text-3xl font-black">No hay torneo activo</h2><p className="mx-auto mt-2 max-w-xl text-slate-300">Creá uno desde admin, cargá 16 jugadores y sorteá. La home se convierte automáticamente en la puerta al evento.</p><Link className="btn btn-primary mt-5" to="/admin">Crear torneo</Link></section>}

      <section className="grid gap-4 md:grid-cols-3">
        <Info icon="⚡" title="Carga en 20 segundos" text="Modal grande, score rápido, goleadores y cierre sin vueltas." />
        <Info icon="🎲" title="Sorteo épico" text="Cruces aleatorios, bracket listo y edición manual si hace falta." />
        <Info icon="🔗" title="Magic links" text="Cada jugador ve su camino, ranking y stats sin tocar el admin." />
      </section>
    </div>
  );
}
function Info({ icon, title, text }) { return <div className="glass rounded-3xl p-5 shadow-card"><div className="text-3xl">{icon}</div><h3 className="mt-3 text-xl font-black">{title}</h3><p className="mt-2 text-sm text-slate-300">{text}</p></div>; }
