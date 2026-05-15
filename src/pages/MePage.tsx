import { useEffect, useMemo, useState } from 'react';
import { BadgePill } from '../components/BadgePill';
import { EmptyState } from '../components/EmptyState';
import { MatchCard } from '../components/MatchCard';
import { StatPill } from '../components/StatPill';
import { UltimatePlayerCard } from '../components/UltimatePlayerCard';
import { useAuth } from '../context/AuthContext';
import { getActiveTournament, listMatches, listParticipants } from '../lib/firestore';
import { calculatePlayerStats } from '../lib/stats';
import type { Match, Participant } from '../types';

export function MePage() {
  const { profile } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  useEffect(() => { getActiveTournament().then(async (t) => { if (!t) return; setParticipants(await listParticipants(t.id)); setMatches(await listMatches(t.id)); }); }, []);
  const participant = participants.find((item) => item.userId === profile?.id) ?? null;
  const nextMatch = matches.find((match) => match.status === 'ready' && (match.playerAId === profile?.id || match.playerBId === profile?.id));
  const stats = useMemo(() => profile ? calculatePlayerStats(profile.id, matches) : null, [profile, matches]);
  if (!profile) return null;
  return <div className="space-y-6"><UltimatePlayerCard user={profile} participant={participant} /><section className="grid gap-4 md:grid-cols-4"><StatPill label="PJ" value={stats?.played ?? 0} /><StatPill label="Victorias" value={stats?.wins ?? 0} /><StatPill label="DG" value={stats?.goalDiff ?? 0} /><StatPill label="Efectividad" value={`${stats?.effectiveness ?? 0}%`} /></section><section><h2 className="mb-3 text-xl font-black">Próximo partido</h2>{nextMatch ? <MatchCard match={nextMatch} /> : <EmptyState title="Todavía no hay partido listo" description="Cuando el admin sortee el bracket, vas a ver tu rival acá." />}</section><div className="flex flex-wrap gap-2"><BadgePill icon="🔥" label="Vestuario abierto" /><BadgePill icon="🎮" label="Listo para competir" /></div></div>;
}
