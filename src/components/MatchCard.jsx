import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Gamepad2 } from 'lucide-react';
import { roundLabels } from '../lib/bracket';

export function MatchCard({ match, onClick, admin = false }) {
  const done = match.status === 'finished';
  return (
    <motion.article whileHover={{ y: -3 }} className="glass w-full rounded-3xl p-4 text-left shadow-card transition hover:border-electric/40">
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="mb-3 flex items-center justify-between text-[11px] font-black uppercase tracking-[.22em] text-slate-400">
          <span>{roundLabels[match.round]}</span>
          <span className={done ? 'text-winner' : 'text-pending'}>{done ? <CheckCircle2 className="inline h-4 w-4" /> : <Clock className="inline h-4 w-4" />} {done ? 'cerrado' : 'pendiente'}</span>
        </div>
        {match.leg && <p className="mb-2 text-xs font-black uppercase tracking-[.2em] text-electric">{match.leg === 1 ? 'Ida' : 'Vuelta'}</p>}
        <TeamLine name={match.playerAName || 'Por definir'} team={match.teamA} score={match.scoreA} winner={match.winnerId === match.playerAId} />
        <div className="my-2 h-px bg-white/10" />
        <TeamLine name={match.playerBName || 'Por definir'} team={match.teamB} score={match.scoreB} winner={match.winnerId === match.playerBId} />
        {(match.penaltyA != null && match.penaltyB != null) && <p className="mt-2 text-xs text-slate-300">Penales: {match.penaltyA}-{match.penaltyB}</p>}
        {match.narrative && <p className="mt-3 rounded-2xl bg-white/5 p-3 text-xs text-slate-300">{match.narrative}</p>}
      </button>
      {admin && !done && <button className="btn btn-primary mt-4 w-full" onClick={onClick}><Gamepad2 className="h-4 w-4" /> Cargar resultado</button>}
    </motion.article>
  );
}

function TeamLine({ name, team, score, winner }) {
  return <div className="flex items-center justify-between gap-3"><div><p className={`text-lg font-black ${winner ? 'text-winner' : ''}`}>{name}</p><p className="text-xs text-slate-400">{team || 'Equipo pendiente'}</p></div><span className="text-3xl font-black tabular-nums">{score ?? '-'}</span></div>;
}
