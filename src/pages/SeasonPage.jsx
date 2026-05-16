import { BarChart3, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { buildRanking, listTournaments } from '../lib/firestore';
export function SeasonPage() {
    const { year = String(new Date().getFullYear()) } = useParams();
    const season = Number(year);
    const [rows, setRows] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    useEffect(() => { void buildRanking(season).then(setRows); void listTournaments().then((items) => setTournaments(items.filter((item) => item.season === season))); }, [season]);
    return <div className="space-y-6"><section className="glass rounded-[2rem] p-6"><p className="text-xs font-black uppercase tracking-[.3em] text-electric">Temporada</p><h1 className="text-5xl font-black">Ranking {season}</h1><p className="mt-2 text-slate-300">Puntos: campeón +10, subcampeón +7, semifinal +5, cuartos +3, octavos +1, victoria +2.</p></section><div className="grid gap-6 lg:grid-cols-[1fr_360px]"><LeaderboardTable rows={rows}/><aside className="space-y-4"><div className="glass rounded-3xl p-4"><h2 className="font-black"><Crown className="mr-2 inline text-pending"/> Campeones históricos</h2><div className="mt-3 space-y-2">{tournaments.filter((t) => t.status === 'finished').map((t) => <p key={t.id} className="rounded-2xl bg-white/5 p-3 text-sm">{t.name}</p>)}</div></div><div className="glass rounded-3xl p-4"><h2 className="font-black"><BarChart3 className="mr-2 inline text-electric"/> Global</h2><p className="mt-3 text-sm text-slate-300">{tournaments.length} torneos registrados · {rows.reduce((acc, row) => acc + row.goalsFor, 0)} goles históricos.</p></div></aside></div></div>;
}
