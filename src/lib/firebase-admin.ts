
import * as admin from 'firebase-admin';

// Esta variável de ambiente é injetada automaticamente pelo Firebase App Hosting.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!admin.apps.length) {
  // A inicialização só ocorre se a chave de serviço estiver presente.
  // Isso evita erros durante o processo de build do Next.js.
  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });
    } catch (error) {
      console.error('Firebase admin initialization error:', (error as Error).message);
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Firebase Admin SDK not initialized.');
  }
}

// Exporta o adminDb apenas se a inicialização foi bem-sucedida.
const adminDb = admin.apps.length ? admin.firestore() : undefined;

export { adminDb };
