'use server';
/**
 * @fileOverview A flow to send stock alerts via push notifications.
 *
 * - sendStockAlerts - Checks for alerts and sends notifications to a user.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as admin from 'firebase-admin';
import { differenceInDays, parseISO } from 'date-fns';
import type { Product } from '@/lib/types';


// Helper function to initialize admin app safely
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
        });
      } catch (e) {
        console.error('Firebase Admin initialization error', e);
      }
    }
    return admin;
}


export const sendStockAlerts = ai.defineFlow(
  {
    name: 'sendStockAlerts',
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      alertsFound: z.number(),
      tokensFound: z.number(),
      notificationsSent: z.number(),
    }),
  },
  async ({ userId }) => {
    const adminApp = initializeFirebaseAdmin();
    const db = adminApp.firestore();
    const messaging = adminApp.messaging();

    if (!adminApp.apps.length) {
      return { success: false, message: 'Firebase Admin not initialized.', alertsFound: 0, tokensFound: 0, notificationsSent: 0 };
    }

    try {
      // 1. Get user's products
      const productsSnapshot = await db.collection(`users/${userId}/products`).get();
      if (productsSnapshot.empty) {
        return { success: true, message: 'No products found for user.', alertsFound: 0, tokensFound: 0, notificationsSent: 0 };
      }

      const expiringSoon: string[] = [];
      const lowStock: string[] = [];

      productsSnapshot.forEach((doc) => {
        const product = doc.data() as Product;
        if (product.currentStock === 0) return;

        // Ensure expiryDate is a valid string before parsing
        if (typeof product.expiryDate !== 'string' || !product.expiryDate) {
            return;
        }
        
        const daysToExpiry = differenceInDays(parseISO(product.expiryDate), new Date());
        
        if (daysToExpiry >= 0 && daysToExpiry <= 7) {
          expiringSoon.push(product.name);
        }
        if (product.currentStock > 0 && product.currentStock <= product.minimumStock) {
          lowStock.push(product.name);
        }
      });
      
      const totalAlerts = expiringSoon.length + lowStock.length;
      if (totalAlerts === 0) {
        return { success: true, message: 'No alerts to send.', alertsFound: 0, tokensFound: 0, notificationsSent: 0 };
      }

      // 2. Construct notification message
      let title = 'Alerta de Estoque!';
      let body = '';
      if (expiringSoon.length > 0 && lowStock.length > 0) {
        body = `Você tem ${expiringSoon.length} produto(s) vencendo e ${lowStock.length} com estoque baixo.`;
      } else if (expiringSoon.length > 0) {
        body = `Você tem ${expiringSoon.length} produto(s) vencendo em breve.`;
      } else {
        body = `Você tem ${lowStock.length} produto(s) com estoque baixo.`;
      }

      // 3. Get user's FCM tokens
      const tokensSnapshot = await db.collection(`users/${userId}/fcmTokens`).get();
      if (tokensSnapshot.empty) {
        return { success: true, message: 'No notification tokens found for user.', alertsFound: totalAlerts, tokensFound: 0, notificationsSent: 0 };
      }
      const tokens = tokensSnapshot.docs.map(doc => doc.id);
      
      // 4. Send notifications
      const message: admin.messaging.MulticastMessage = {
        tokens: tokens,
        notification: {
          title: title,
          body: body,
        },
        webpush: {
          notification: {
            icon: '/logo.png', // Make sure you have a logo.png in your public folder
          },
          fcmOptions: {
            link: '/alerts' // Open the alerts page on click
          }
        }
      };
      
      const response = await messaging.sendEachForMulticast(message);

      // 5. Clean up invalid tokens
      const tokensToDelete: string[] = [];
      response.responses.forEach((result, index) => {
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

      return { 
        success: true, 
        message: `Sent ${response.successCount} notifications.`,
        alertsFound: totalAlerts,
        tokensFound: tokens.length,
        notificationsSent: response.successCount
      };
    } catch (error) {
      console.error('Error sending stock alerts:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { success: false, message: errorMessage, alertsFound: 0, tokensFound: 0, notificationsSent: 0 };
    }
  }
);
