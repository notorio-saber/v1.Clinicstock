import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB0ae8Sx_tquzgYaukQj_S4YFNj-RMXbX8",
  authDomain: "clinicstock.firebaseapp.com",
  projectId: "clinicstock",
  storageBucket: "clinicstock.firebasestorage.app",
  messagingSenderId: "148870614912",
  appId: "1:148870614912:web:be87f6b3b8ecb599c33b65"
};

let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
