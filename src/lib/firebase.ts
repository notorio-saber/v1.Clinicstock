import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB0ae8Sx_tquzgYaukQj_S4YFNj-RMXbX8",
  authDomain: "clinicstock.firebaseapp.com",
  projectId: "clinicstock",
  storageBucket: "clinicstock.appspot.com",
  messagingSenderId: "148870614912",
  appId: "1:148870614912:web:be87f6b3b8ecb599c33b65"
};

// Initialize Firebase only on the client side
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else if (getApps().length) {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

// @ts-ignore
export { app, auth, db, storage };