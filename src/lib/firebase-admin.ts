
import * as admin from 'firebase-admin';

// This is a temporary workaround to avoid build errors.
// The service account key should be set as an environment variable in a real production environment.
// On Firebase App Hosting, this is handled automatically.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}';

if (!admin.apps.length) {
  try {
    // We try to parse the service account key. If it's an empty object string, it will fail gracefully.
    const credentials = JSON.parse(serviceAccount);
    if (credentials.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(credentials),
        });
    } else {
        console.log("Firebase admin SDK not initialized on the server due to missing credentials. This is expected during local client-side rendering.");
    }
  } catch (error) {
    // This will likely fail during client-side build, which is fine.
    console.log('Firebase admin initialization error. This is expected in client-side build.', (error as Error).message);
  }
}

// Ensure that we only export adminDb if the app was initialized
const adminDb = admin.apps.length ? admin.firestore() : undefined;


export { adminDb };
