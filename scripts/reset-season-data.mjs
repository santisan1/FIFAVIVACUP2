import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../src/lib/firebase.js';

const collectionsToDelete = [
  'tournaments',
  'tournamentPlayers',
  'matches',
  'goals',
  'feedEvents',
  'tournamentResults',
  'seasonPointEvents',
  'players',
];

async function clearCollection(name) {
  const snap = await getDocs(collection(db, name));
  await Promise.all(snap.docs.map((item) => deleteDoc(doc(db, name, item.id))));
  return snap.size;
}

(async () => {
  console.log('⚠️ Reinicio total: borrando datos de torneo y jugadores...');
  for (const name of collectionsToDelete) {
    const deleted = await clearCollection(name);
    console.log(`- ${name}: ${deleted} documentos eliminados`);
  }
  console.log('✅ Base limpia. Podés arrancar de 0.');
})();
