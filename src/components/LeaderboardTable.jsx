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
  function SortHeader({ label, keyName }) {
    const active = sortBy === keyName;
    return (
      <button type="button" className={`inline-flex items-center gap-1 ${active ? 'text-electric' : 'text-slate-400'}`} onClick={() => onSortChange?.(keyName)}>
        {label} {active ? '↓' : ''}
      </button>
    );
  }

  return (
    <div className="glass overflow-hidden rounded-3xl shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400">
          <tr>
            <th className="p-4">Rank</th>
            <th className="p-4">Jugador</th>
            <th className="p-4"><SortHeader label="Pts" keyName="points" /></th>
            <th className="hidden p-4 md:table-cell"><SortHeader label="Goles +" keyName="goalsFor" /></th>
            <th className="hidden p-4 md:table-cell"><SortHeader label="Goles -" keyName="goalsAgainst" /></th>
            <th className="hidden p-4 md:table-cell"><SortHeader label="Victorias" keyName="wins" /></th>
            <th className="hidden p-4 md:table-cell"><SortHeader label="Títulos" keyName="titles" /></th>
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
