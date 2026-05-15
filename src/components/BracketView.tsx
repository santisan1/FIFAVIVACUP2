import type { Match } from '../types';
import { MatchCard } from './MatchCard';
const rounds = ['R16', 'QF', 'SF', 'FINAL'] as const;
export function BracketView({ matches }: { matches: Match[] }) {
  return <div className="grid gap-5 lg:grid-cols-4">{rounds.map((round) => <section key={round} className="space-y-3"><h3 className="text-sm font-black uppercase tracking-[.25em] text-electric">{round}</h3>{matches.filter((m) => m.round === round).map((match) => <MatchCard key={match.id} match={match} />)}{matches.filter((m) => m.round === round).length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Esperando cruces</div>}</section>)}</div>;
}
