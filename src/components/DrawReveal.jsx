import { Sparkles, Timer, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

function pairParticipants(participants) {
  const pairs = [];
  for (let index = 0; index < participants.length; index += 2) {
    const a = participants[index];
    const b = participants[index + 1];
    if (a && b) pairs.push([a, b]);
  }
  return pairs;
}

export function DrawReveal({ participants, isAdmin = false }) {
  const pairs = useMemo(() => pairParticipants(participants), [participants]);
  const names = useMemo(() => participants.map((p) => p.playerNickname || p.playerName), [participants]);
  const totalSlots = pairs.length * 2;

  const [started, setStarted] = useState(false);
  const [currentSlot, setCurrentSlot] = useState(0);
  const [rouletteName, setRouletteName] = useState('');

  const completed = started && currentSlot >= totalSlots;
  const shouldRender = isAdmin || !completed;

  useEffect(() => {
    if (!started || names.length === 0 || currentSlot >= totalSlots) return undefined;
    const roulette = window.setInterval(() => {
      setRouletteName(names[Math.floor(Math.random() * names.length)]);
    }, 90);
    const lock = window.setTimeout(() => {
      window.clearInterval(roulette);
      setRouletteName('');
      setCurrentSlot((value) => value + 1);
    }, 2200);
    return () => {
      window.clearInterval(roulette);
      window.clearTimeout(lock);
    };
  }, [started, names, currentSlot, totalSlots]);

  useEffect(() => {
    setStarted(false);
    setCurrentSlot(0);
    setRouletteName('');
  }, [participants]);

  if (!shouldRender || pairs.length === 0) return null;

  return (
    <section className="glass rounded-3xl p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Ritual del sorteo</p>
          <h3 className="mt-2 text-2xl font-black">Octavos con suspenso</h3>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setStarted(true); setCurrentSlot(0); }} disabled={started && !completed}>
            <Sparkles className="h-4 w-4" /> {completed ? 'Repetir show' : 'Iniciar show'}
          </button>
        )}
      </div>

      {started && currentSlot < totalSlots && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-3xl bg-pending/10 p-4 text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-pending"><Timer className="mr-2 inline h-4 w-4" /> ruleta encendida</p>
          <p className="mt-2 text-3xl font-black">{rouletteName || '...'}</p>
          <p className="mt-1 text-sm text-slate-300">Revelando nombre {Math.min(currentSlot + 1, totalSlots)} de {totalSlots}</p>
        </motion.div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {pairs.map(([playerA, playerB], index) => {
          const firstSlot = index * 2;
          const secondSlot = firstSlot + 1;
          const firstRevealed = started && currentSlot > firstSlot;
          const secondRevealed = started && currentSlot > secondSlot;
          return (
            <motion.div key={`${playerA.id}-${playerB.id}`} initial={{ opacity: 0.25, scale: 0.98 }} animate={{ opacity: secondRevealed ? 1 : 0.45, scale: secondRevealed ? 1 : 0.98 }} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-[.2em] text-electric">Octavo #{index + 1}</p>
              <p className="mt-2 text-xl font-black">{firstRevealed ? playerA.playerNickname || playerA.playerName : '???'} <span className="text-slate-500">vs</span> {secondRevealed ? playerB.playerNickname || playerB.playerName : '???'}</p>
              <p className="text-sm text-slate-300">{firstRevealed ? playerA.teamName || 'Equipo pendiente' : '...'} vs {secondRevealed ? playerB.teamName || 'Equipo pendiente' : '...'}</p>
            </motion.div>
          );
        })}
      </div>

      {completed && <p className="mt-4 rounded-2xl bg-winner/10 p-3 text-center text-sm font-black text-winner"><Trophy className="mr-2 inline h-4 w-4" /> ¡Sorteo completo! Cruces definidos.</p>}
    </section>
  );
}
