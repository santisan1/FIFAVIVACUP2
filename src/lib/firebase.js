import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
    apiKey: 'AIzaSyDjvl_-86Qgvo7Qj6xW4lQO5N6NAcP2CQY',
    authDomain: 'fifavivacup.firebaseapp.com',
    projectId: 'fifavivacup',
    storageBucket: 'fifavivacup.firebasestorage.app',
    messagingSenderId: '587568479309',
    appId: '1:587568479309:web:d9f9869d715b1b06c7b004',
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
