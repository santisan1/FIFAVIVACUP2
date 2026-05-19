const SORT_OPTIONS = [
  { key: 'points', label: 'Puntaje' },
  { key: 'goalsFor', label: 'Goles hechos' },
  { key: 'goalsAgainst', label: 'Goles recibidos' },
  { key: 'wins', label: 'Victorias' },
  { key: 'titles', label: 'Títulos' },
];

function sortRows(rows, sortBy) {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (sortBy === 'goalsAgainst') return a.goalsAgainst - b.goalsAgainst || b.points - a.points;
    return (b[sortBy] ?? 0) - (a[sortBy] ?? 0) || b.points - a.points || b.wins - a.wins;
  });
  return sorted;
}

export function LeaderboardTable({ rows, sortBy = 'points', onSortChange }) {
  const sortedRows = sortRows(rows, sortBy);

  return (
    <div className="glass overflow-hidden rounded-3xl shadow-card">
      <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[.15em] ${sortBy === option.key ? 'bg-electric/20 text-electric' : 'bg-white/5 text-slate-300'}`}
            onClick={() => onSortChange?.(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400">
          <tr>
            <th className="p-4">Rank</th>
            <th className="p-4">Jugador</th>
            <th className="p-4">Pts</th>
            <th className="hidden p-4 md:table-cell">Goles +</th>
            <th className="hidden p-4 md:table-cell">Goles -</th>
            <th className="hidden p-4 md:table-cell">Victorias</th>
            <th className="hidden p-4 md:table-cell">Títulos</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={row.playerId} className="border-t border-white/10">
              <td className="p-4 text-2xl font-black">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</td>
              <td className="p-4"><b>{row.nickname}</b><p className="text-xs text-slate-400">{row.team}</p></td>
              <td className="p-4 text-2xl font-black text-electric">{row.points}</td>
              <td className="hidden p-4 text-slate-300 md:table-cell">{row.goalsFor}</td>
              <td className="hidden p-4 text-slate-300 md:table-cell">{row.goalsAgainst}</td>
              <td className="hidden p-4 text-slate-300 md:table-cell">{row.wins}</td>
              <td className="hidden p-4 text-slate-300 md:table-cell">{row.titles}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
