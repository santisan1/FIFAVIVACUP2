import { motion } from 'framer-motion';
import { ArrowRight, Crown, Monitor, Shield, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { roundLabels } from '../lib/bracket';
import { getActiveTournament, listMatches, listTournamentPlayers } from '../lib/firestore';

export function HomePage() {
  const [active, setActive] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      const tournament = await getActiveTournament();
      setActive(tournament);
      if (tournament) {
        const [players, tournamentMatches] = await Promise.all([listTournamentPlayers(tournament.id), listMatches(tournament.id)]);
        setParticipants(players);
        setMatches(tournamentMatches);
      } else {
        setParticipants([]);
        setMatches([]);
      }
    })().finally(() => setLoading(false));
  }, []);

  const year = active?.season ?? new Date().getFullYear();
  const played = useMemo(() => matches.filter((match) => match.status === 'finished'), [matches]);
  const nextMatches = useMemo(() => matches.filter((match) => match.status !== 'finished' && match.playerAId && match.playerBId).slice(0, 3), [matches]);

  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(56,189,248,.20),rgba(139,92,246,.12)),url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center p-6 shadow-card md:p-10">
        <div className="absolute inset-0 bg-night/70 backdrop-blur-[2px]" />
        <div className="relative max-w-3xl space-y-5">
          <p className="inline-flex rounded-full border border-electric/30 bg-electric/10 px-4 py-2 text-xs font-black uppercase tracking-[.3em] text-electric"><Sparkles className="mr-2 h-4 w-4" /> Broadcast deportivo para tu juntada</p>
          <h1 className="text-5xl font-black leading-none md:text-7xl">FIFAVIVA CUP</h1>
          <p className="text-lg text-slate-200 md:text-xl">Bracket épico, resultados en segundos, ranking anual y perfiles por magic link sin login pesado.</p>
        </div>
      </motion.section>

      {loading ? <div className="glass h-56 animate-pulse rounded-[2rem]" /> : active ? (
        <section className="glass overflow-hidden rounded-[2rem] p-5 shadow-card md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex rounded-full bg-winner/10 px-3 py-1 text-xs font-black uppercase tracking-[.25em] text-winner"><Crown className="mr-2 h-4 w-4" /> Torneo activo</p>
              <h2 className="mt-3 text-4xl font-black md:text-5xl">{active.name}</h2>
              <p className="mt-2 text-slate-300">Temporada {active.season} · estado <b>{active.status}</b></p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
              <Stat label="Jugadores" value={`${participants.length}/16`} />
              <Stat label="Jugados" value={played.length} />
              <Stat label="Próximos" value={nextMatches.length} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {nextMatches.length ? nextMatches.map((match) => <NextMatch key={match.id} match={match} />) : <p className="rounded-3xl border border-dashed border-white/10 p-4 text-sm text-slate-400 md:col-span-3">Todavía no hay próximos partidos listos. Agregá 16 jugadores y sorteá cruces desde admin.</p>}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link className="btn btn-primary w-full" to={`/tournament/${active.id}`}>Ver torneo <ArrowRight className="h-4 w-4" /></Link>
            <Link className="btn btn-ghost w-full" to={`/admin/tournament/${active.id}`}><Shield className="h-4 w-4" /> Gestionar torneo</Link>
            <Link className="btn btn-ghost w-full" to={`/tv/${active.id}`}><Monitor className="h-4 w-4" /> Modo TV</Link>
            <Link className="btn btn-ghost w-full" to={`/season/${year}`}>Ranking anual</Link>
          </div>
        </section>
      ) : (
        <section className="glass rounded-[2rem] p-8 text-center shadow-card">
          <Trophy className="mx-auto h-12 w-12 text-electric" />
          <h2 className="mt-3 text-3xl font-black">Todavía no hay torneo activo</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">Creá uno desde admin, cargá jugadores, copiá magic links y sorteá el bracket para que esta Home sea la puerta al evento.</p>
          <Link className="btn btn-primary mt-5" to="/admin">Crear torneo desde Admin</Link>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Info icon="⚡" title="Carga en 20 segundos" text="Scores rápidos, cierre claro y ganador avanzando automáticamente." />
        <Info icon="🎲" title="Sorteo épico" text="16 jugadores, cruces aleatorios y bracket listo para proyectar." />
        <Info icon="🔗" title="Magic links" text="Cada jugador recibe su perfil para seguir camino, stats y ranking." />
      </section>
    </div>
  );
}

function Stat({ label, value }) { return <div className="rounded-3xl bg-white/5 p-4"><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">{label}</p><b className="mt-1 block text-3xl text-white">{value}</b></div>; }
function NextMatch({ match }) { return <div className="rounded-3xl bg-white/5 p-4"><p className="text-xs font-black uppercase tracking-[.2em] text-electric">{roundLabels[match.round]}</p><b className="mt-2 block text-lg">{match.playerAName} vs {match.playerBName}</b><p className="text-sm text-slate-400">{match.teamA} vs {match.teamB}</p></div>; }
function Info({ icon, title, text }) { return <div className="glass rounded-3xl p-5 shadow-card"><div className="text-3xl">{icon}</div><h3 className="mt-3 text-xl font-black">{title}</h3><p className="mt-2 text-sm text-slate-300">{text}</p></div>; }
