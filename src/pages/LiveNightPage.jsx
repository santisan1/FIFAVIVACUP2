import { Crown, Radio } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BracketView } from '../components/BracketView';
import { getPlayer, getTournament, listFeed, listMatches, listTournamentPlayers } from '../lib/firestore';

export function LiveNightPage() {
  const { id = '', tournamentId = '' } = useParams();
  const liveId = tournamentId || id;
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [feed, setFeed] = useState([]);
  const [champion, setChampion] = useState('');
  const [participants, setParticipants] = useState([]);
  useEffect(() => { void (async () => { const t = await getTournament(liveId); setTournament(t); setMatches(await listMatches(liveId)); setParticipants(await listTournamentPlayers(liveId)); setFeed(await listFeed(liveId)); if (t?.championPlayerId) setChampion((await getPlayer(t.championPlayerId))?.nickname ?? 'Campeón'); })(); }, [liveId]);
  const next = useMemo(() => matches.find((match) => match.status !== 'finished' && match.playerAId && match.playerBId), [matches]);
  const last = useMemo(() => matches.filter((match) => match.status === 'finished').at(-1), [matches]);
  const readyCount = useMemo(() => participants.filter((participant) => participant.ready).length, [participants]);
  return (
    <div className="space-y-6">
      <section className="glass rounded-[2rem] p-6 shadow-card">
        <p className="inline-flex rounded-full bg-electric/10 px-3 py-1 text-xs font-black uppercase tracking-[.3em] text-electric"><Radio className="mr-2 h-4 w-4" /> Live Night Mode</p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h1 className="text-5xl font-black md:text-7xl">{tournament?.name ?? 'Modo pantalla'}</h1><p className="text-slate-300">Bracket grande · próximo partido · relato</p></div>{champion && <div className="rounded-3xl bg-pending/15 p-4 text-pending"><Crown className="mr-2 inline h-5 w-5" /> Campeón: <b>{champion}</b></div>}</div>
      </section>
      {['draft', 'lobby', 'draw'].includes(tournament?.status) && <section className="glass rounded-[2rem] p-8 text-center shadow-card"><h2 className="text-5xl font-black">{tournament?.status === 'draw' ? 'Sorteo en curso' : tournament?.status === 'lobby' ? 'Sala de espera' : 'Torneo en preparación'}</h2><p className="mt-3 text-2xl text-slate-300">{tournament?.status === 'lobby' ? `${readyCount}/${participants.length || 16} presentes` : 'Esperando al admin'}</p></section>}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <BracketView matches={matches} compact />
        <aside className="space-y-4">
          <Box title="Próximo partido">{next ? <p className="text-2xl font-black">{next.playerAName} vs {next.playerBName}</p> : <p className="text-slate-400">Esperando próximo cruce.</p>}</Box>
          <Box title="Último resultado">{last ? <p className="text-2xl font-black">{last.playerAName} {last.scoreA}-{last.scoreB} {last.playerBName}</p> : <p className="text-slate-400">Sin resultados todavía.</p>}</Box>
          <Box title="Relato">{feed.slice(0, 5).map((event) => <p key={event.id} className="rounded-2xl bg-white/5 p-3 text-sm">{event.text}</p>)}</Box>
        </aside>
      </div>
    </div>
  );
}
function Box({ title, children }) { return <section className="glass rounded-3xl p-4 shadow-card"><h2 className="mb-3 text-sm font-black uppercase tracking-[.25em] text-electric">{title}</h2><div className="space-y-2">{children}</div></section>; }
