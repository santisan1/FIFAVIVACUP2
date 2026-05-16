export function LeaderboardTable({ rows }) {
  return (
    <div className="glass overflow-hidden rounded-3xl shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400">
          <tr>
            <th className="p-4">Rank</th>
            <th className="p-4">Jugador</th>
            <th className="p-4">Pts</th>
            <th className="hidden p-4 md:table-cell">Stats</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.playerId} className="border-t border-white/10">
              <td className="p-4 text-2xl font-black">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</td>
              <td className="p-4"><b>{row.nickname}</b><p className="text-xs text-slate-400">{row.team}</p></td>
              <td className="p-4 text-2xl font-black text-electric">{row.points}</td>
              <td className="hidden p-4 text-slate-300 md:table-cell">🏆 {row.titles} · 🥈 {row.runnerUps} · ✅ {row.wins} · ⚽ {row.goalsFor} · 🛡️ {row.goalsAgainst}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
