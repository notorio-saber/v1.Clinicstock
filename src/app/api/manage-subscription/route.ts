
'use server';

import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import {db} from '@/lib/firebase';
import {doc, getDoc} from 'firebase/firestore';
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

    const headersList = headers();
    const origin = headersList.get('origin');

    // Default return URL if the user exits the portal
    const returnUrl = `${origin}/profile`;

    // Step 1: Check if we have a Stripe customer ID stored in Firestore
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);

    let customerId: string | undefined = userDocSnap.data()?.stripeCustomerId;

    // Step 2: If no customer ID exists, create a new customer in Stripe
    if (!customerId) {
        // This is a fallback. The customer ID should ideally be created and stored
        // via a webhook when the first subscription is created. Since webhooks are
        // not working, we won't have a customerId. For this flow to work, the user
        // must have completed a checkout session, which creates a customer.
        // We cannot create a portal session without a customer ID.
        return new NextResponse(
            'Stripe customer ID not found for this user. Please complete a subscription first.',
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
