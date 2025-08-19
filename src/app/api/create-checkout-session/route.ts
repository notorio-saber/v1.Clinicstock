
'use server';

import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

// This function handles POST requests to create a Stripe Checkout session
export async function POST(req: Request) {
  try {
    const {userId, userEmail, priceId} = await req.json();

    // 1. Validate input parameters
    if (!userId || !priceId || !userEmail) {
      return NextResponse.json(
        {message: 'Missing required parameters: userId, userEmail, and priceId.'},
        {status: 400}
      );
    }
    
    // Ensure adminDb is initialized
    if (!adminDb) {
      return NextResponse.json(
        { message: 'Firebase Admin SDK not initialized.' },
        { status: 500 }
      );
    }

    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:3000';

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();

    let customerId: string | undefined;

    if (userDocSnap.exists) {
        customerId = userDocSnap.data()?.stripeCustomerId;
    }

    // 2. Find or create a Stripe Customer
    if (!customerId) {
      try {
        const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
        } else {
            const customer = await stripe.customers.create({
              email: userEmail,
              metadata: {
                firebaseUID: userId,
              },
            });
            customerId = customer.id;
        }
        // Store the new customer ID in Firestore
        await userDocRef.set({stripeCustomerId: customerId}, {merge: true});
      } catch (customerError) {
         console.error('Stripe customer creation/retrieval error:', customerError);
         const errorMessage = customerError instanceof Error ? customerError.message : 'Failed to create/retrieve Stripe customer.';
         return NextResponse.json({ message: errorMessage }, { status: 500 });
      }
    }

    // 3. Create a Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Define success and cancel URLs
      success_url: `${origin}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription`,
    });

    // 4. Return the session URL
    if (session.url) {
      return NextResponse.json({url: session.url});
    } else {
      return NextResponse.json(
        {message: 'Failed to create a checkout session.'},
        {status: 500}
      );
    }
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({message: errorMessage}, {status: 500});
  }
}
