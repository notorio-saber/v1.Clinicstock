// IMPORTANT: This file should not be used with 'use server'
// It's a pure API route for server-side execution.

import { NextRequest, NextResponse } from 'next/server';
import { getStockAlerts } from '@/ai/flows/send-alerts-flow';

// Dynamically import server-side packages to avoid bundling them on the client
import type * as admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK
// This ensures it's initialized only once.
let adminApp: admin.app.App;
function initializeFirebaseAdmin() {
    const admin_sdk = require('firebase-admin');
    if (admin_sdk.apps.length > 0) {
        return admin_sdk.apps[0];
    }
    return admin_sdk.initializeApp({
        credential: admin_sdk.credential.applicationDefault(),
    });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    // 1. Get alert data from the Genkit flow
    const alertData = await getStockAlerts({ userId });

    if (alertData.alertsFound === 0) {
      return NextResponse.json({
        success: true,
        message: 'No alerts to send.',
        alertsFound: 0,
        notificationsSent: 0
      });
    }
    
    // Initialize Firebase Admin (safe to call multiple times)
    const app = initializeFirebaseAdmin();
    const messaging = require('firebase-admin/messaging').getMessaging(app);
    const db = require('firebase-admin/firestore').getFirestore(app);

    // 2. Get user's FCM tokens from Firestore
    const tokensSnapshot = await db.collection(`users/${userId}/fcmTokens`).get();
    
    if (tokensSnapshot.empty) {
        return NextResponse.json({ 
            success: true, 
            message: 'No notification tokens found for user.', 
            alertsFound: alertData.alertsFound, 
            notificationsSent: 0 
        });
    }
    const tokens = tokensSnapshot.docs.map((doc: any) => doc.id);

    // 3. Send notifications via FCM
    const messagePayload = {
        tokens: tokens,
        notification: {
            title: alertData.notificationTitle,
            body: alertData.notificationBody,
        },
        webpush: {
            notification: {
                icon: '/logo.png',
            },
            fcmOptions: {
                link: '/alerts'
            }
        }
    };
    
    const response = await messaging.sendEachForMulticast(messagePayload);

    // 4. (Optional) Clean up invalid tokens
    const tokensToDelete: string[] = [];
    response.responses.forEach((result: any, index: number) => {
        if (!result.success) {
            const error = result.error?.code;
            if (error === 'messaging/registration-token-not-registered' ||
                error === 'messaging/invalid-registration-token') {
                tokensToDelete.push(tokens[index]);
            }
        }
    });

    if (tokensToDelete.length > 0) {
        const batch = db.batch();
        tokensToDelete.forEach(token => {
            batch.delete(db.collection(`users/${userId}/fcmTokens`).doc(token));
        });
        await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sent ${response.successCount} notifications.`,
      alertsFound: alertData.alertsFound,
      notificationsSent: response.successCount
    });

  } catch (error) {
    console.error('Error in send-alert API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
