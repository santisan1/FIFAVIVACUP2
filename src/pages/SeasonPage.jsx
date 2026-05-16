import { BarChart3, Crown, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { buildRanking, getPlayer, listTournamentResultsBySeason, listTournaments } from '../lib/firestore';

export function SeasonPage() {
  const { year = String(new Date().getFullYear()) } = useParams();
  const season = Number(year);
  const [rows, setRows] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [results, setResults] = useState([]);
  const [champions, setChampions] = useState({});

  useEffect(() => {
    void (async () => {
      const [ranking, allTournaments, seasonResults] = await Promise.all([buildRanking(season), listTournaments(), listTournamentResultsBySeason(season)]);
      const seasonTournaments = allTournaments.filter((item) => item.season === season);
      setRows(ranking);
      setTournaments(seasonTournaments);
      setResults(seasonResults);
      const championEntries = await Promise.all(seasonTournaments.filter((tournament) => tournament.championPlayerId).map(async (tournament) => [tournament.id, await getPlayer(tournament.championPlayerId)]));
      setChampions(Object.fromEntries(championEntries));
    })();
  }, [season]);

  const resultsByTournament = useMemo(() => {
    return results.reduce((acc, result) => {
      acc[result.tournamentId] = [...(acc[result.tournamentId] ?? []), result].sort((a, b) => b.annualPoints - a.annualPoints);
      return acc;
    }, {});
  }, [results]);

  return (
    <div className="space-y-6">
      <section className="glass rounded-[2rem] p-6 shadow-card">
        <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Temporada</p>
        <h1 className="text-5xl font-black">Ranking {season}</h1>
        <p className="mt-2 text-slate-300">Puntos: campeón +10, subcampeón +7, semifinal +5, cuartos +3, octavos +1, victoria +2, goleador +2 y menos goles recibidos +1.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <LeaderboardTable rows={rows} />
        <aside className="space-y-4">
          <div className="glass rounded-3xl p-4 shadow-card">
            <h2 className="font-black"><Crown className="mr-2 inline text-pending" /> Campeones históricos</h2>
            <div className="mt-3 space-y-2">
              {tournaments.filter((tournament) => tournament.status === 'finished').map((tournament) => (
                <p key={tournament.id} className="rounded-2xl bg-white/5 p-3 text-sm"><b>{champions[tournament.id]?.nickname ?? 'Campeón'}</b><br /><span className="text-xs text-slate-400">{tournament.name}</span></p>
              ))}
            </div>
          </div>
          <div className="glass rounded-3xl p-4 shadow-card">
            <h2 className="font-black"><BarChart3 className="mr-2 inline text-electric" /> Global</h2>
            <p className="mt-3 text-sm text-slate-300">{tournaments.length} torneos registrados · {rows.reduce((acc, row) => acc + row.goalsFor, 0)} goles históricos.</p>
          </div>
        </aside>
      </div>

      <section className="glass rounded-3xl p-5 shadow-card">
        <h2 className="text-xl font-black"><Trophy className="mr-2 inline h-5 w-5 text-electric" /> Puntos por torneo</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="rounded-3xl bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3"><b>{tournament.name}</b><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{tournament.status}</span></div>
              <div className="mt-3 space-y-2">
                {(resultsByTournament[tournament.id] ?? []).slice(0, 6).map((result) => <div key={result.id} className="flex items-center justify-between rounded-2xl bg-black/20 p-2 text-sm"><span>{result.playerNickname}</span><b className="text-electric">+{result.annualPoints}</b></div>)}
                {!resultsByTournament[tournament.id] && <p className="text-sm text-slate-400">Este torneo todavía no cerró.</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
