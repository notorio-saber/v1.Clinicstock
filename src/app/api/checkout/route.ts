import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { userId, priceId } = await req.json();

    if (!userId || !priceId) {
      console.error('POST /api/checkout - Error: Missing userId or priceId');
      return new NextResponse('Missing userId or priceId', { status: 400 });
    }

    const checkoutSessionRef = collection(db, 'customers', userId, 'checkout_sessions');

    const newSessionDoc = await addDoc(checkoutSessionRef, {
      price: priceId,
      success_url: `${req.headers.get('origin')}/dashboard`,
      cancel_url: `${req.headers.get('origin')}/subscription`,
    });

    return new Promise<NextResponse>((resolve, reject) => {
      const unsubscribe = onSnapshot(
        doc(db, 'customers', userId, 'checkout_sessions', newSessionDoc.id),
        (snap) => {
          const { error, url } = snap.data() as { error?: { message: string }; url?: string };
          if (error) {
            unsubscribe();
            console.error(`An error occurred in checkout session snapshot: ${error.message}`);
            reject(new NextResponse(error.message, { status: 500 }));
          }
          if (url) {
            unsubscribe();
            resolve(NextResponse.json({ url }));
          }
        },
        (err) => {
            unsubscribe();
            console.error("onSnapshot error in checkout API:", err);
            reject(new NextResponse('Internal Server Error on snapshot listen', { status: 500 }));
        }
      );

       // Set a timeout to prevent the function from hanging indefinitely
        setTimeout(() => {
            unsubscribe();
            console.error('POST /api/checkout - Error: Request timed out after 20 seconds.');
            reject(new NextResponse('Request timed out.', { status: 504 }));
        }, 20000); // 20 seconds timeout
    });

  } catch (error) {
    console.error('POST /api/checkout - General catch block error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
