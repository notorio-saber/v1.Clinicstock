
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

    // 1. Validate input parameters
    if (!userId || !priceId) {
      return NextResponse.json(
        {message: 'Missing required parameters: userId and priceId.'},
        {status: 400}
      );
    }

    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:3000';

    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);

    // 2. Check if user exists in Firestore
    if (!userDocSnap.exists()) {
      return NextResponse.json(
        {message: 'User not found in Firestore.'},
        {status: 404}
      );
    }

    const userData = userDocSnap.data();
    let customerId: string | undefined = userData?.stripeCustomerId;

    // 3. Find or create a Stripe Customer
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: userData?.email, // Pass user's email, which is crucial
          metadata: {
            firebaseUID: userId,
          },
        });
        customerId = customer.id;
        // Store the new customer ID in Firestore
        await setDoc(userDocRef, {stripeCustomerId: customerId}, {merge: true});
      } catch (customerError) {
         console.error('Stripe customer creation error:', customerError);
         const errorMessage = customerError instanceof Error ? customerError.message : 'Failed to create Stripe customer.';
         return NextResponse.json({ message: errorMessage }, { status: 500 });
      }
    }

    // 4. Create a Checkout session
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

    // 5. Return the session URL
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
