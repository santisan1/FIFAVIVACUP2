import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { samplePlayers } from '../data/samplePlayers';
import type { AppUser, Match, Participant, SamplePlayer, Season, Tournament } from '../types';

export async function getUserProfile(uid: string) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as AppUser) : null;
}

export async function listUsers() {
  const snapshot = await getDocs(query(collection(db, 'users'), orderBy('name')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AppUser);
}

export async function listTournaments() {
  const snapshot = await getDocs(query(collection(db, 'tournaments'), orderBy('date', 'desc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Tournament);
}

export async function getActiveTournament() {
  const snapshot = await getDocs(query(collection(db, 'tournaments'), where('status', 'in', ['draft', 'draw_done', 'active']), limit(1)));
  return snapshot.docs[0] ? ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Tournament) : null;
}

export async function listParticipants(tournamentId: string) {
  const snapshot = await getDocs(query(collection(db, 'participants'), where('tournamentId', '==', tournamentId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Participant);
}

export async function listMatches(tournamentId: string) {
  const snapshot = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', tournamentId), orderBy('matchNumber')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Match);
}

export async function createPlayer(input: SamplePlayer) {
  const ref = doc(collection(db, 'users'));
  await setDoc(ref, {
    id: ref.id,
    name: input.name,
    nickname: input.nickname,
    phone: input.phone,
    favoriteTeam: input.teamName,
    role: 'player',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function importSamplePlayers() {
  const batch = writeBatch(db);
  samplePlayers.forEach((player) => {
    const ref = doc(collection(db, 'users'));
    batch.set(ref, {
      id: ref.id,
      name: player.name,
      nickname: player.nickname,
      phone: player.phone,
      favoriteTeam: player.teamName,
      role: 'player',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function ensureActiveSeason(year = 2026) {
  const existing = await getDocs(query(collection(db, 'seasons'), where('year', '==', year), limit(1)));
  if (existing.docs[0]) return { id: existing.docs[0].id, ...existing.docs[0].data() } as Season;
  const ref = await addDoc(collection(db, 'seasons'), {
    name: `Temporada ${year}`,
    year,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(ref, { id: ref.id });
  return { id: ref.id, name: `Temporada ${year}`, year, status: 'active' } as Season;
}

export async function createTournament(input: { name: string; date: string; createdBy: string }) {
  const season = await ensureActiveSeason(new Date(input.date).getFullYear() || 2026);
  const ref = await addDoc(collection(db, 'tournaments'), {
    seasonId: season.id,
    name: input.name,
    date: input.date,
    status: 'draft',
    format: 'single_elimination',
    size: 16,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function addParticipant(tournamentId: string, user: AppUser, teamName: string) {
  const ref = await addDoc(collection(db, 'participants'), {
    tournamentId,
    userId: user.id,
    userName: user.name,
    nickname: user.nickname,
    teamName,
    eliminated: false,
    inviteStatus: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function runDraw(tournament: Tournament, participants: Participant[]) {
  const { createR16Matches } = await import('./bracket');
  const batch = writeBatch(db);
  const matches = createR16Matches(participants, tournament.id, tournament.seasonId);
  matches.forEach((match) => {
    const ref = doc(collection(db, 'matches'));
    batch.set(ref, { id: ref.id, ...match, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  batch.update(doc(db, 'tournaments', tournament.id), { status: 'draw_done', updatedAt: serverTimestamp() });
  await batch.commit();
}
