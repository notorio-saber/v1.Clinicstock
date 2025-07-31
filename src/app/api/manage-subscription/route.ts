import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
require('dotenv').config();

// This is the URL of our deployed Firebase Function.
// It is created by the "Stripe Customer Portal" Firebase Extension.
const CUSTOMER_PORTAL_URL = 'https://clinicstock.firebaseapp.com/stripe-portal';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 });
    }

    const portalLinksRef = collection(db, 'customers', userId, 'portal_links');

    const newPortalDoc = await addDoc(portalLinksRef, {
      return_url: `${req.headers.get('origin')}/profile`,
    });

    return new Promise<NextResponse>((resolve, reject) => {
      const unsubscribe = onSnapshot(
        doc(db, 'customers', userId, 'portal_links', newPortalDoc.id),
        (snap) => {
          const { error, url } = snap.data() as { error?: { message: string }; url?: string };
          if (error) {
            unsubscribe();
            console.error(`An error occurred: ${error.message}`);
            reject(new NextResponse(error.message, { status: 500 }));
          }
          if (url) {
            unsubscribe();
            resolve(NextResponse.json({ url }));
          }
        },
        (err) => {
            unsubscribe();
            console.error("onSnapshot error:", err);
            reject(new NextResponse('Internal Server Error', { status: 500 }));
        }
      );

      // Timeout to prevent hanging
      setTimeout(() => {
          unsubscribe();
          reject(new NextResponse('Request timed out.', { status: 504 }));
      }, 20000);
    });

  } catch (error) {
    console.error('POST /api/manage-subscription error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
