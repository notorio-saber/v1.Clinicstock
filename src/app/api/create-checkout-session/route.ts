
'use server';

import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import {db} from '@/lib/firebase';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

// This function handles POST requests to create a Stripe Checkout session
export async function POST(req: Request) {
  try {
    const {userId, priceId} = await req.json();

    if (!userId) {
      return new NextResponse('Missing userId', {status: 400});
    }
    if (!priceId) {
      return new NextResponse('Missing priceId', {status: 400});
    }

    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:3000';

    // Step 1: Check if we have a Stripe customer ID stored for this user
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    let customerId: string | undefined = userDocSnap.data()?.stripeCustomerId;

    // Step 2: If no customer ID exists, create one and store it
    if (!customerId) {
      const user = userDocSnap.data(); // we need user's email
      const customer = await stripe.customers.create({
        // email: user?.email, // Assuming user doc contains email
        metadata: {
          firebaseUID: userId,
        },
      });
      customerId = customer.id;
      // Store the new customer ID in Firestore
      await setDoc(userDocRef, {stripeCustomerId: customerId}, {merge: true});
    }

    // Step 3: Create a Checkout session
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

    // Step 4: Return the session ID
    if (session.url) {
        return NextResponse.json({ url: session.url });
    } else {
        return new NextResponse('Failed to create a checkout session.', {status: 500});
    }

  } catch (error) {
    console.error('Stripe checkout session error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return new NextResponse(errorMessage, {status: 500});
  }
}
