const SORT_OPTIONS = [
  { key: 'points', label: 'Pts' },
  { key: 'goalsFor', label: 'Goles +' },
  { key: 'goalsAgainst', label: 'Goles -' },
  { key: 'goalDiff', label: 'Dif' },
  { key: 'wins', label: 'Victorias' },
  { key: 'titles', label: 'Títulos' },
];

function sortRows(rows, sortBy) {
  const sorted = [...rows];
  const pointsTieBreak = (a, b) => (((b.goalsFor ?? 0) - (b.goalsAgainst ?? 0)) - ((a.goalsFor ?? 0) - (a.goalsAgainst ?? 0))) || ((b.goalsFor ?? 0) - (a.goalsFor ?? 0));
  sorted.sort((a, b) => {
    if (sortBy === 'goalsAgainst') return a.goalsAgainst - b.goalsAgainst || b.points - a.points || pointsTieBreak(a, b);
    if (sortBy === 'goalDiff') return ((b.goalsFor ?? 0) - (b.goalsAgainst ?? 0)) - ((a.goalsFor ?? 0) - (a.goalsAgainst ?? 0)) || b.points - a.points || (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
    return (b[sortBy] ?? 0) - (a[sortBy] ?? 0) || b.points - a.points || pointsTieBreak(a, b);
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
      <div className="border-b border-white/10 bg-electric/5 px-3 py-2 text-xs text-electric">Tip celu: girá el teléfono a horizontal para ver más columnas, o deslizá la tabla a derecha/izquierda.</div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400">
          <tr>
            <th className="p-4">Rank</th>
            <th className="p-4">Jugador</th>
            {renderSortableHeader('Pts', 'points')}
            {renderSortableHeader('Goles +', 'goalsFor', 'hidden md:table-cell')}
            {renderSortableHeader('Goles -', 'goalsAgainst', 'hidden md:table-cell')}
            {renderSortableHeader('Dif', 'goalDiff', 'hidden md:table-cell')}
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
              <td className="hidden p-4 text-slate-300 md:table-cell">{(row.goalsFor ?? 0) - (row.goalsAgainst ?? 0)}</td>
              <td className="hidden p-4 text-slate-300 md:table-cell">{row.wins}</td>
              <td className="hidden p-4 text-slate-300 md:table-cell">{row.titles}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
