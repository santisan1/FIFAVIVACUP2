import { Sparkles, Timer, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function pairParticipants(participants) {
  const pairs = [];
  for (let index = 0; index < participants.length; index += 2) {
    const a = participants[index];
    const b = participants[index + 1];
    if (a && b) pairs.push([a, b]);
  }
  return pairs;
}

export function DrawReveal({ participants, mode = 'single_leg' }) {
  const shuffled = useMemo(() => shuffle(participants), [participants]);
  const pairs = useMemo(() => pairParticipants(shuffled), [shuffled]);
  const groups = useMemo(() => ['A', 'B', 'C', 'D'].map((name, idx) => ({ name, players: shuffled.slice(idx * 4, idx * 4 + 4) })).filter((g) => g.players.length), [shuffled]);
  const names = useMemo(() => shuffled.map((p) => p.playerNickname || p.playerName), [shuffled]);
  const [started, setStarted] = useState(false);
  const [currentPair, setCurrentPair] = useState(0);
  const revealTotal = mode === 'groups_16' ? groups.length : pairs.length;
  const [rouletteName, setRouletteName] = useState('');

  useEffect(() => {
    if (!started || names.length === 0 || currentPair >= revealTotal) return undefined;
    const roulette = window.setInterval(() => {
      setRouletteName(names[Math.floor(Math.random() * names.length)]);
    }, 110);
    const lock = window.setTimeout(() => {
      window.clearInterval(roulette);
      setRouletteName('');
      setCurrentPair((value) => value + 1);
    }, 1900);
    return () => {
      window.clearInterval(roulette);
      window.clearTimeout(lock);
    };
  }, [started, names, currentPair, revealTotal]);

  useEffect(() => {
    setStarted(false);
    setCurrentPair(0);
    setRouletteName('');
  }, [participants]);

  return (
    <section className="glass rounded-3xl p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Ritual del sorteo</p>
          <h3 className="mt-2 text-2xl font-black">{mode === 'groups_16' ? 'Sorteo de grupos con suspenso' : 'Octavos con suspenso'}</h3>
        </div>
        <button className="btn btn-primary" onClick={() => { setStarted(true); setCurrentPair(0); }} disabled={revealTotal === 0}>
          <Sparkles className="h-4 w-4" /> Empezar show
        </button>
      </div>

      {started && currentPair < revealTotal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-3xl bg-pending/10 p-4 text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-pending"><Timer className="mr-2 inline h-4 w-4" /> ruleta encendida</p>
          <p className="mt-2 text-3xl font-black">{rouletteName || '...'}</p>
        </motion.div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {mode === 'groups_16' ? groups.map((group, index) => {
          const revealed = started && index < currentPair;
          return (
            <motion.div key={group.name} initial={{ opacity: 0.25, scale: 0.98 }} animate={{ opacity: revealed ? 1 : 0.35, scale: revealed ? 1 : 0.98 }} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-[.2em] text-electric">Grupo {group.name}</p>
              {revealed ? group.players.map((player) => <p key={player.id} className="mt-2 text-sm font-bold">{player.playerNickname || player.playerName} · <span className="text-slate-300">{player.teamName || 'Equipo pendiente'}</span></p>) : <p className="mt-2 text-sm text-slate-400">Preparando grupo...</p>}
            </motion.div>
          );
        }) : pairs.map(([playerA, playerB], index) => {
          const revealed = started && index < currentPair;
          return (
            <motion.div key={`${playerA.id}-${playerB.id}`} initial={{ opacity: 0.25, scale: 0.98 }} animate={{ opacity: revealed ? 1 : 0.35, scale: revealed ? 1 : 0.98 }} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-[.2em] text-electric">Octavo #{index + 1}</p>
              {revealed ? (
                <>
                  <p className="mt-2 text-xl font-black">{playerA.playerNickname || playerA.playerName} vs {playerB.playerNickname || playerB.playerName}</p>
                  <p className="text-sm text-slate-300">{playerA.teamName || 'Equipo pendiente'} vs {playerB.teamName || 'Equipo pendiente'}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-400">Preparando cruce...</p>
              )}
            </motion.div>
          );
        })}
      </div>

      {started && currentPair >= revealTotal && <p className="mt-4 rounded-2xl bg-winner/10 p-3 text-center text-sm font-black text-winner"><Trophy className="mr-2 inline h-4 w-4" /> {mode === 'groups_16' ? '¡Sorteo completo! Ya quedaron armados los 4 grupos y el camino a cuartos/semis/final.' : '¡Sorteo completo! Ya están todos los cruces de octavos.'}</p>}
    </section>
  );
}
