
import * as admin from 'firebase-admin';

// This is a temporary workaround to avoid build errors.
// The service account key should be set as an environment variable in a real production environment.
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
        console.log("Firebase admin SDK not initialized due to missing credentials.");
    }
  } catch (error) {
    console.log('Firebase admin initialization error. This is expected in client-side build.', error);
  }
}

// Ensure that we only export adminDb if the app was initialized
let adminDb;
if (admin.apps.length) {
    adminDb = admin.firestore();
} else {
    // Provide a mock or dummy object in environments where the admin SDK is not initialized
    adminDb = {
        collection: (name: string) => ({
            doc: (id: string) => ({
                get: () => Promise.resolve({ exists: false, data: () => null }),
                set: () => Promise.resolve(),
            }),
        }),
    };
}


export { adminDb };
