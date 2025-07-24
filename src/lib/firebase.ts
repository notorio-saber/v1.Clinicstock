// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, runTransaction } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0ae8Sx_tquzgYaukQj_S4YFNj-RMXbX8",
  authDomain: "clinicstock.firebaseapp.com",
  projectId: "clinicstock",
  storageBucket: "clinicstock.firebasestorage.app",
  messagingSenderId: "148870614912",
  appId: "1:148870614912:web:be87f6b3b8ecb599c33b65"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, runTransaction };
