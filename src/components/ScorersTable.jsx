export function ScorersTable({ rows, highlightPlayerId }) {
  return (
    <div className="glass overflow-hidden rounded-3xl shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-[.2em] text-slate-400">
          <tr><th className="p-4">Jugador</th><th className="p-4">Goles</th></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const highlighted = row.playerOwnerId === highlightPlayerId;
            return (
              <tr key={row.playerOwnerId} className={`border-t border-white/10 ${highlighted ? 'bg-electric/10' : ''}`}>
                <td className="p-4 font-black">#{index + 1} {row.playerName}{highlighted && <span className="ml-2 rounded-full bg-electric/20 px-2 py-1 text-[10px] text-electric">vos</span>}</td>
                <td className="p-4 text-2xl font-black text-electric">{row.goals}</td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td className="p-4 text-sm text-slate-400" colSpan="2">Todavía no hay goles cargados.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
