import { TournamentHero } from '../components/TournamentHero';
import { MatchCard } from '../components/MatchCard';
import { StatPill } from '../components/StatPill';

const demoMatch = { id: 'demo', tournamentId: 'demo', seasonId: '2026', round: 'R16' as const, roundLabel: 'Octavos', matchNumber: 1, bracketPosition: 1, playerAName: 'Santi', playerBName: 'Rama', teamAName: 'Real Madrid', teamBName: 'Manchester City', status: 'ready' as const };
export function HomePage() { return <div className="space-y-6"><TournamentHero /><div className="grid gap-5 md:grid-cols-3"><StatPill label="Formato" value="16 KO" /><StatPill label="Deadline" value="23/05" /><StatPill label="Modo" value="Live" /></div><section className="grid gap-5 lg:grid-cols-2"><div><h2 className="mb-3 text-xl font-black">Próximo partido destacado</h2><MatchCard match={demoMatch} /></div><div className="glass rounded-3xl p-5"><h2 className="text-xl font-black">Top 3 anual</h2><ol className="mt-4 space-y-3 text-sm"><li>🥇 Campeón por definir</li><li>🥈 Finalista por definir</li><li>🥉 Revelación por definir</li></ol></div></section></div>; }
