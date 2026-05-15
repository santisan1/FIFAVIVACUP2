import { useEffect, useState } from 'react';
import { BracketView } from '../components/BracketView';
import { EmptyState } from '../components/EmptyState';
import { getActiveTournament, listMatches } from '../lib/firestore';
import type { Match, Tournament } from '../types';
export function LivePage() { const [tournament, setTournament] = useState<Tournament | null>(null); const [matches, setMatches] = useState<Match[]>([]); useEffect(() => { getActiveTournament().then(async (t) => { setTournament(t); if (t) setMatches(await listMatches(t.id)); }); }, []); return <div className="space-y-5"><h1 className="text-4xl font-black">Torneo en vivo</h1>{tournament ? <BracketView matches={matches} /> : <EmptyState title="No hay torneo activo" description="El admin puede crear Viva Cup I desde /admin/tournaments." />}</div>; }
