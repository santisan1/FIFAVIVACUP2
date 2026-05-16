import { roundLabels, roundOrder } from '../lib/bracket';
import { MatchCard } from './MatchCard';
export function BracketView({ matches, onMatchClick }) {
    return (<div className="grid gap-5 lg:grid-cols-4">
      {roundOrder.map((round) => {
            const roundMatches = matches.filter((match) => match.round === round).sort((a, b) => a.bracketPosition - b.bracketPosition);
            return <section key={round} className="space-y-3"><h3 className="text-sm font-black uppercase tracking-[.25em] text-electric">{roundLabels[round]}</h3>{roundMatches.map((match) => <MatchCard key={match.id} match={match} onClick={() => onMatchClick?.(match)}/>)}{roundMatches.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Esperando clasificados</div>}</section>;
        })}
    </div>);
}
