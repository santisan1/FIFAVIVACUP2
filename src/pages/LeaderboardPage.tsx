import { LeaderboardTable } from '../components/LeaderboardTable';
import { calculateRanking } from '../lib/points';
export function LeaderboardPage() { return <div className="space-y-5"><h1 className="text-4xl font-black">Ranking anual</h1><LeaderboardTable rows={calculateRanking([], [])} /></div>; }
