import { useEffect, useState } from 'react';
import { BracketView } from '../components/BracketView';
import { listMatches } from '../lib/firestore';
import type { Match } from '../types';
export function BracketPage({ tournamentId }: { tournamentId: string }) { const [matches, setMatches] = useState<Match[]>([]); useEffect(() => { listMatches(tournamentId).then(setMatches); }, [tournamentId]); return <div className="space-y-5"><h1 className="text-4xl font-black">Bracket público</h1><BracketView matches={matches} /></div>; }
