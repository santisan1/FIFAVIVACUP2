import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { BracketView } from '../components/BracketView';
import { ScoreInput } from '../components/ScoreInput';
import { listMatches } from '../lib/firestore';
import type { Match } from '../types';
export function AdminMatchesPage({ id }: { id: string }) { const [matches, setMatches] = useState<Match[]>([]); useEffect(() => { listMatches(id).then(setMatches); }, [id]); return <AdminLayout><div className="space-y-6"><h1 className="text-4xl font-black">Gestión de partidos</h1><ScoreInput /><BracketView matches={matches} /></div></AdminLayout>; }
