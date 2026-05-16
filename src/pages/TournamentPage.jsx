import { Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BracketView } from '../components/BracketView';
import { ScorersTable } from '../components/ScorersTable';
import { buildScorers, getPlayer, getTournament, listFeed, listMatches } from '../lib/firestore';
export function TournamentPage() {
    const { id = '' } = useParams();
    const [tournament, setTournament] = useState(null);
    const [matches, setMatches] = useState([]);
    const [scorers, setScorers] = useState([]);
    const [feed, setFeed] = useState([]);
    const [champion, setChampion] = useState('');
    useEffect(() => { void (async () => { const t = await getTournament(id); setTournament(t); setMatches(await listMatches(id)); setScorers(await buildScorers(id)); setFeed(await listFeed(id)); if (t?.championPlayerId)
        setChampion((await getPlayer(t.championPlayerId))?.nickname ?? 'Campeón'); })(); }, [id]);
    return <div className="space-y-6"><section className="glass rounded-[2rem] p-6"><p className="text-xs font-black uppercase tracking-[.3em] text-electric">{tournament?.status ?? 'loading'}</p><h1 className="mt-2 text-4xl font-black md:text-6xl">{tournament?.name ?? 'Torneo'}</h1>{champion && <p className="mt-4 inline-flex rounded-full bg-pending/15 px-4 py-2 font-black text-pending"><Crown className="mr-2 h-5 w-5"/> Campeón: {champion}</p>}</section><div className="grid gap-6 xl:grid-cols-[1fr_360px]"><BracketView matches={matches}/><aside className="space-y-5"><Panel title="Pendientes">{matches.filter((m) => m.status !== 'finished' && m.playerAId && m.playerBId).slice(0, 4).map((m) => <p key={m.id} className="rounded-2xl bg-white/5 p-3 text-sm">{m.playerAName} vs {m.playerBName}</p>)}</Panel><Panel title="Goleadores"><ScorersTable rows={scorers.slice(0, 5)}/></Panel><Panel title="Feed narrativo">{feed.map((event) => <p key={event.id} className="rounded-2xl bg-white/5 p-3 text-sm text-slate-200">{event.text}</p>)}</Panel></aside></div></div>;
}
function Panel({ title, children }) { return <section className="glass rounded-3xl p-4"><h2 className="mb-3 font-black">{title}</h2><div className="space-y-2">{children}</div></section>; }
