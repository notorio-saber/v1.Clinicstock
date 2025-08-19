
'use server';

import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import Stripe from 'stripe';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

// This function handles POST requests to create a Stripe Checkout session
export async function POST(req: Request) {
  try {
    const {userId, priceId, userEmail} = await req.json();

    // 1. Validate input parameters
    if (!userId || !priceId) {
      return NextResponse.json(
        {message: 'Missing required parameters: userId and priceId.'},
        {status: 400}
      );
    }
    
    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:3000';

    let customerId: string;

    // 2. Find an existing Stripe Customer by matching the Firebase UID in metadata
    const customers = await stripe.customers.list({
      limit: 1,
      metadata: { firebaseUID: userId },
    });

    if (customers.data.length > 0) {
      // Customer exists, use their ID
      customerId = customers.data[0].id;
    } else {
      // 3. If no customer found, create a new Stripe Customer
      // We store the Firebase UID in the metadata to link the two systems
      const customer = await stripe.customers.create({
        email: userEmail, // Email is optional for customer creation but good practice
        metadata: {
          firebaseUID: userId,
        },
      });
      customerId = customer.id;
    }
    
    // 4. Create a Checkout session for the customer
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
      // Define success and cancel URLs. The success URL now includes a flag.
      success_url: `${origin}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription`,
    });

    // 5. Return the session URL to the frontend
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
