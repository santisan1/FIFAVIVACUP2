import { motion } from 'framer-motion';
import { CheckCircle2, Clock } from 'lucide-react';
import { roundLabels } from '../lib/bracket';
export function MatchCard({ match, onClick }) {
    const done = match.status === 'finished';
    return (<motion.button type="button" onClick={onClick} whileHover={{ y: -3 }} className="glass w-full rounded-3xl p-4 text-left shadow-card transition hover:border-electric/40">
      <div className="mb-3 flex items-center justify-between text-[11px] font-black uppercase tracking-[.22em] text-slate-400">
        <span>{roundLabels[match.round]}</span>
        <span className={done ? 'text-winner' : 'text-pending'}>{done ? <CheckCircle2 className="inline h-4 w-4"/> : <Clock className="inline h-4 w-4"/>} {match.status}</span>
      </div>
      <TeamLine name={match.playerAName || 'Por definir'} team={match.teamA} score={match.scoreA} winner={match.winnerId === match.playerAId}/>
      <div className="my-2 h-px bg-white/10"/>
      <TeamLine name={match.playerBName || 'Por definir'} team={match.teamB} score={match.scoreB} winner={match.winnerId === match.playerBId}/>
      {match.narrative && <p className="mt-3 rounded-2xl bg-white/5 p-3 text-xs text-slate-300">{match.narrative}</p>}
    </motion.button>);
}
function TeamLine({ name, team, score, winner }) {
    return <div className="flex items-center justify-between gap-3"><div><p className={`text-lg font-black ${winner ? 'text-winner' : ''}`}>{name}</p><p className="text-xs text-slate-400">{team || 'Equipo pendiente'}</p></div><span className="text-3xl font-black tabular-nums">{score ?? '-'}</span></div>;
}
