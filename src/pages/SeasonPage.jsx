import { BarChart3, Crown, Info, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { buildRanking, getPlayer, listMatches, listTournamentResultsBySeason, listTournaments } from '../lib/firestore';

export function SeasonPage() {
  const { year = String(new Date().getFullYear()) } = useParams();
  const season = Number(year);
  const [rows, setRows] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [results, setResults] = useState([]);
  const [champions, setChampions] = useState({});
  const [sortBy, setSortBy] = useState('points');
  const [showInfo, setShowInfo] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedMatches, setSelectedMatches] = useState([]);

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

  async function openTournamentSummary(tournament) {
    setSelectedTournament(tournament);
    setSelectedMatches(await listMatches(tournament.id));
  }

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
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-5xl font-black">Ranking {season}</h1>
          <button type="button" className="rounded-full bg-white/10 p-2 text-slate-200 transition hover:bg-white/20" onClick={() => setShowInfo((value) => !value)} aria-label="Información de puntaje">
            <Info className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-slate-300">Orden por puntaje anual por defecto. Podés reordenar por goles, victorias o títulos desde la tabla.</p>
        {showInfo && (
          <div className="mt-3 rounded-2xl bg-white/5 p-4 text-sm text-slate-200">
            <p className="font-bold">Cómo suma puntos el ranking anual</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
              <li>Campeón +10 · Subcampeón +7 · Semifinal +5 · Cuartos +3 · Octavos +1.</li>
              <li>Cada victoria en partido cerrado suma +2.</li>
              <li>Bono goleador del torneo +2 y mejor defensa (menos goles recibidos) +1.</li>
              <li>Todos los puntos se acumulan por jugador permanente (playerId), no por equipo puntual.</li>
            </ul>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <LeaderboardTable rows={rows} sortBy={sortBy} onSortChange={setSortBy} />
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
            <button key={tournament.id} type="button" className="w-full rounded-3xl bg-white/5 p-4 text-left" onClick={() => openTournamentSummary(tournament)}>
              <div className="flex items-center justify-between gap-3"><b>{tournament.name}</b><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{tournament.status}</span></div>
              <div className="mt-3 space-y-2">
                {(resultsByTournament[tournament.id] ?? []).slice(0, 6).map((result) => <div key={result.id} className="flex items-center justify-between rounded-2xl bg-black/20 p-2 text-sm"><span>{result.playerNickname}</span><b className="text-electric">+{result.annualPoints}</b></div>)}
                {!resultsByTournament[tournament.id] && <p className="text-sm text-slate-400">Este torneo todavía no cerró.</p>}
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedTournament && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="glass w-full max-w-4xl rounded-[2rem] p-5 shadow-card"><div className="flex items-center justify-between"><h3 className="text-2xl font-black">Resumen: {selectedTournament.name}</h3><button className="btn btn-ghost" onClick={() => setSelectedTournament(null)}>Cerrar</button></div><p className="mt-2 text-sm text-slate-300">Modalidad: {selectedTournament.mode === 'two_legs' ? 'Ida y vuelta (final única)' : 'Solo ida'}.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><div><h4 className="font-black">Cruces (resumen)</h4><div className="mt-2 space-y-2 max-h-72 overflow-auto">{selectedMatches.map((m) => <div key={m.id} className="rounded-2xl bg-white/5 p-2 text-sm"><b>{m.playerAName} {m.scoreA ?? '-'}-{m.scoreB ?? '-'} {m.playerBName}</b><p className="text-xs text-slate-400">{m.round} · {m.status}</p></div>)}</div></div><div><h4 className="font-black">Tabla del torneo</h4><div className="mt-2 space-y-2 max-h-72 overflow-auto">{(resultsByTournament[selectedTournament.id] ?? []).map((r, i) => <div key={r.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-2 text-sm"><span>#{i + 1} {r.playerNickname}</span><b className="text-electric">+{r.annualPoints}</b></div>)}</div></div></div></div></div>}
    </div>
  );
}
