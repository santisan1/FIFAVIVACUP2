import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../src/lib/firebase.js';
import { emptyStats } from '../src/types/index.js';

const collectionsToDelete = [
  'tournaments',
  'tournamentPlayers',
  'matches',
  'goals',
  'feedEvents',
  'tournamentResults',
  'seasonPointEvents',
];

async function clearCollection(name) {
  const snap = await getDocs(collection(db, name));
  await Promise.all(snap.docs.map((item) => deleteDoc(doc(db, name, item.id))));
  return snap.size;
}

async function resetPlayersStats() {
  const snap = await getDocs(collection(db, 'players'));
  const players = snap.docs;
  let updated = 0;
  for (let i = 0; i < players.length; i += 400) {
    const chunk = players.slice(i, i + 400);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      batch.update(doc(db, 'players', item.id), { statsGlobal: emptyStats() });
      updated += 1;
    });
    await batch.commit();
  }
  return updated;
}

(async () => {
  console.log('⚠️ Reinicio de competencia: borra torneos/partidos pero mantiene jugadores.');
  for (const name of collectionsToDelete) {
    const deleted = await clearCollection(name);
    console.log(`- ${name}: ${deleted} documentos eliminados`);
  }
  const playersUpdated = await resetPlayersStats();
  console.log(`- players: ${playersUpdated} jugadores conservados con stats reseteadas`);
  console.log('✅ Listo. Quedaron solo jugadores, como recién cargados.');
})();
