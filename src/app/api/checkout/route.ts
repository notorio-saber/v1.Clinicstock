import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { Stripe } from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});


export async function POST(req: Request) {
  try {
    const { userId, priceId } = await req.json();

    if (!userId || !priceId) {
      console.error('POST /api/checkout - Error: Missing userId or priceId');
      return new NextResponse('Missing userId or priceId', { status: 400 });
    }
    
    // Fetch customer's email from Firestore. Note this is a simplification.
    // In a real app, you might already have this or would handle customer creation more robustly.
    // This part is commented out as we don't have a customers collection yet.
    // const customerSnap = await getDoc(doc(db, 'customers', userId));
    // const customerEmail = customerSnap.exists() ? customerSnap.data().email : undefined;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get('origin')}/subscription`,
        metadata: {
            userId: userId,
        },
        // customer_email: customerEmail, // Pre-fill email if available
    });
    
    if (session.url) {
      return NextResponse.json({ url: session.url });
    } else {
      return new NextResponse('Failed to create Stripe checkout session', { status: 500 });
    }

  } catch (error) {
    console.error('POST /api/checkout - General catch block error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(errorMessage, { status: 500 });
  }
}
