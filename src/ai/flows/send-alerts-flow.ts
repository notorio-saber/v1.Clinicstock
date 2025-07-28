'use server';
/**
 * @fileOverview A flow to check for stock alerts for a user.
 * This flow identifies expiring and low-stock products but does not send notifications.
 *
 * - getStockAlerts - Checks for alerts and returns the details.
 * - StockAlertsInput - The input type for the getStockAlerts function.
 * - StockAlertsOutput - The return type for the getStockAlerts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Product } from '@/lib/types';
import {initializeApp, getApps, App, credential} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import { differenceInDays, parseISO } from 'date-fns';

// Helper function to initialize admin app safely
const initializeFirebaseAdmin = (): App => {
    const apps = getApps();
    if (apps.length > 0) {
        return apps[0];
    }
    // This works in App Hosting environments
    return initializeApp({
        credential: credential.applicationDefault(),
    });
}

const StockAlertsInputSchema = z.object({
  userId: z.string(),
});
export type StockAlertsInput = z.infer<typeof StockAlertsInputSchema>;


const StockAlertsOutputSchema = z.object({
  alertsFound: z.number(),
  expiringSoon: z.array(z.string()),
  lowStock: z.array(z.string()),
  notificationTitle: z.string(),
  notificationBody: z.string(),
});
export type StockAlertsOutput = z.infer<typeof StockAlertsOutputSchema>;


export async function getStockAlerts(input: StockAlertsInput): Promise<StockAlertsOutput> {
  return stockAlertsFlow(input);
}

const stockAlertsFlow = ai.defineFlow(
  {
    name: 'stockAlertsFlow',
    inputSchema: StockAlertsInputSchema,
    outputSchema: StockAlertsOutputSchema,
  },
  async ({ userId }) => {

    const adminApp = initializeFirebaseAdmin();
    const db = getFirestore(adminApp);

    const productsSnapshot = await db.collection(`users/${userId}/products`).get();

    const expiringSoon: string[] = [];
    const lowStock: string[] = [];

    if (productsSnapshot.empty) {
      return { alertsFound: 0, expiringSoon, lowStock, notificationTitle: '', notificationBody: '' };
    }

    productsSnapshot.forEach((doc) => {
        const product = doc.data() as Product;
        if (product.currentStock === 0) return;

        if (typeof product.expiryDate === 'string' && product.expiryDate) {
            const daysToExpiry = differenceInDays(parseISO(product.expiryDate), new Date());
            if (daysToExpiry >= 0 && daysToExpiry <= 7) {
                expiringSoon.push(product.name);
            }
        }
        
        if (product.currentStock > 0 && product.currentStock <= product.minimumStock) {
            lowStock.push(product.name);
        }
    });

    const totalAlerts = expiringSoon.length + lowStock.length;
    let title = '';
    let body = '';

    if (totalAlerts > 0) {
        title = 'Alerta de Estoque!';
        if (expiringSoon.length > 0 && lowStock.length > 0) {
            body = `Você tem ${expiringSoon.length} produto(s) vencendo e ${lowStock.length} com estoque baixo.`;
        } else if (expiringSoon.length > 0) {
            body = `Você tem ${expiringSoon.length} produto(s) vencendo em breve.`;
        } else {
            body = `Você tem ${lowStock.length} produto(s) com estoque baixo.`;
        }
    }

    return {
      alertsFound: totalAlerts,
      expiringSoon,
      lowStock,
      notificationTitle: title,
      notificationBody: body,
    };
  }
);
