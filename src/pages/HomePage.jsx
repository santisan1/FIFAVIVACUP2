import { motion } from 'framer-motion';
import { ArrowRight, Crown, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveTournament } from '../lib/firestore';
export function HomePage() {
    const [active, setActive] = useState(null);
    useEffect(() => { void getActiveTournament().then(setActive); }, []);
    return (<div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(56,189,248,.20),rgba(139,92,246,.12)),url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center p-6 shadow-card md:p-10">
        <div className="absolute inset-0 bg-night/70 backdrop-blur-[2px]"/>
        <div className="relative max-w-3xl space-y-5">
          <p className="inline-flex rounded-full border border-electric/30 bg-electric/10 px-4 py-2 text-xs font-black uppercase tracking-[.3em] text-electric"><Sparkles className="mr-2 h-4 w-4"/> Arena mode</p>
          <h1 className="text-5xl font-black leading-none md:text-7xl">FIFA Viva Cup</h1>
          <p className="text-lg text-slate-200 md:text-xl">Torneos express de 16 amigos, bracket automático, resultados en segundos y una experiencia digna de final europea.</p>
          <div className="flex flex-wrap gap-3">
            {active ? <Link className="btn btn-primary" to={`/tournament/${active.id}`}>Ver torneo activo <ArrowRight className="h-4 w-4"/></Link> : <Link className="btn btn-primary" to="/admin">Crear torneo <Trophy className="h-4 w-4"/></Link>}
            <Link className="btn btn-ghost" to="/season/2026">Ranking anual</Link>
          </div>
        </div>
      </motion.section>
      <section className="grid gap-4 md:grid-cols-3">
        <Info icon="⚡" title="Carga en 20 segundos" text="Elegí partido, resultado, goleadores y cerrar. Sin formularios eternos."/>
        <Info icon="🎲" title="Sorteo épico" text="Cruces aleatorios con reveal visual y bracket listo automáticamente."/>
        <Info icon="👑" title="Historia viva" text="Ranking anual, badges, goleadores y feed narrativo para picantear la noche."/>
      </section>
      <section className="glass rounded-[2rem] p-5"><div className="flex items-center gap-3"><Crown className="text-pending"/><div><p className="text-sm text-slate-400">Torneo activo</p><h2 className="text-2xl font-black">{active?.name ?? 'Todavía no hay torneo activo'}</h2></div></div></section>
    </div>);
}
function Info({ icon, title, text }) { return <div className="glass rounded-3xl p-5"><div className="text-3xl">{icon}</div><h3 className="mt-3 text-xl font-black">{title}</h3><p className="mt-2 text-sm text-slate-300">{text}</p></div>; }
