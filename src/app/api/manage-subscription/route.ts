'use server';

import {NextResponse} from 'next/server';
import {db} from '@/lib/firebase';
import {collection, addDoc, onSnapshot, doc} from 'firebase/firestore';

// This is a placeholder URL. In a real project, this would be the URL
// of the deployed Firebase Function provided by the "Stripe Customer Portal" Firebase Extension.
// Since the extension seems to not be working, we are creating a more direct integration.
const CUSTOMER_PORTAL_URL = 'https://example.com/stripe-portal'; // This will be replaced by Stripe's actual portal link logic.

export async function POST(req: Request) {
  try {
    const {userId} = await req.json();

    if (!userId) {
      return new NextResponse('Missing userId', {status: 400});
    }

    // This logic relies on the Stripe Firebase Extension creating portal_links.
    // When a document is added to this collection, the extension generates a short-lived
    // URL to the Stripe Customer Portal.
    const portalLinksRef = collection(db, 'customers', userId, 'portal_links');

    const newPortalDoc = await addDoc(portalLinksRef, {
      return_url: `${req.headers.get('origin')}/profile`,
    });

    // We listen for the extension to write the URL back to the document.
    return new Promise<NextResponse>((resolve, reject) => {
      const unsubscribe = onSnapshot(
        doc(db, 'customers', userId, 'portal_links', newPortalDoc.id),
        snap => {
          const {error, url} = snap.data() as {
            error?: {message: string};
            url?: string;
          };
          if (error) {
            unsubscribe();
            console.error(
              `An error occurred while creating the portal link: ${error.message}`
            );
            reject(new NextResponse(error.message, {status: 500}));
          }
          if (url) {
            unsubscribe();
            resolve(NextResponse.json({url}));
          }
        },
        err => {
          unsubscribe();
          console.error('onSnapshot error:', err);
          reject(new NextResponse('Internal Server Error', {status: 500}));
        }
      );

      // Add a timeout to prevent the request from hanging indefinitely if the extension fails.
      setTimeout(() => {
        unsubscribe();
        reject(new NextResponse('Request timed out.', {status: 504}));
      }, 20000); // 20 seconds timeout
    });
  } catch (error) {
    console.error('POST /api/manage-subscription error:', error);
    return new NextResponse('Internal Server Error', {status: 500});
  }
}
