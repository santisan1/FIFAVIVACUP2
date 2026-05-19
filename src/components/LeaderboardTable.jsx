const SORT_OPTIONS = [
  { key: 'points', label: 'Pts' },
  { key: 'goalsFor', label: 'Goles +' },
  { key: 'goalsAgainst', label: 'Goles -' },
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
  const sortLabel = SORT_OPTIONS.find((option) => option.key === sortBy)?.label;
  const renderSortableHeader = (label, key, extraClass = '') => (
    <th className={`p-4 ${extraClass}`}>
      <button type="button" className={`inline-flex items-center gap-1 font-black ${sortBy === key ? 'text-electric' : 'text-slate-400'}`} onClick={() => onSortChange?.(key)}>
        <span>{label}</span>
        <span className="text-[10px]">{sortBy === key ? '▼' : '↕'}</span>
      </button>
    </th>
  );

  return (
    <div className="glass overflow-hidden rounded-3xl shadow-card">
      <div className="border-b border-white/10 p-3 text-xs text-slate-400">Orden actual: <span className="font-black text-electric">{sortLabel}</span></div>
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400">
          <tr>
            <th className="p-4">Rank</th>
            <th className="p-4">Jugador</th>
            {renderSortableHeader('Pts', 'points')}
            {renderSortableHeader('Goles +', 'goalsFor', 'hidden md:table-cell')}
            {renderSortableHeader('Goles -', 'goalsAgainst', 'hidden md:table-cell')}
            {renderSortableHeader('Victorias', 'wins', 'hidden md:table-cell')}
            {renderSortableHeader('Títulos', 'titles', 'hidden md:table-cell')}
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
