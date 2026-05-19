import { initializeApp } from 'firebase/app';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const required = Object.entries(firebaseConfig).filter(([, value]) => !value);
if (required.length) {
  console.error('Faltan variables de entorno Firebase:', required.map(([key]) => key).join(', '));
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
