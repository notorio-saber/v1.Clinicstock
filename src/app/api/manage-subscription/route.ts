
'use server';

import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import { adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

// This function handles POST requests to create a Stripe Customer Portal session
export async function POST(req: Request) {
  try {
    const {userId} = await req.json();

    if (!userId) {
      return new NextResponse('Missing userId', {status: 400});
    }

    if (!adminDb) {
      return new NextResponse('Firebase Admin not initialized', { status: 500 });
    }

    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:3000';

    // Default return URL if the user exits the portal
    const returnUrl = `${origin}/profile`;

    // Step 1: Check if we have a Stripe customer ID stored in Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
        return new NextResponse('User not found in Firestore.', { status: 404 });
    }

    let customerId: string | undefined = userDocSnap.data()?.stripeCustomerId;

    // Step 2: If no customer ID exists, we can't create a portal session.
    if (!customerId) {
        return new NextResponse(
            'Stripe customer ID not found for this user. This should be created during first checkout.',
            { status: 404 }
        );
    }

    // Step 3: Create a Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    // Step 4: Return the URL of the portal session
    if (portalSession.url) {
      return NextResponse.json({url: portalSession.url});
    } else {
      return new NextResponse('Failed to create a portal session.', {
        status: 500,
      });
    }
  } catch (error) {
    console.error('Stripe portal session error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new NextResponse(errorMessage, {status: 500});
  }
}
