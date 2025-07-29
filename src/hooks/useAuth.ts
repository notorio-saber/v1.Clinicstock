'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import type { Subscription } from '@/lib/types';


export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<{ id: string; isActive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }
  }

  useEffect(() => {
    // This effect runs only once on mount to handle auth state.
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            // This case happens on initial load when user is not logged in,
            // or after sign-out.
            try {
                // Check if we are returning from a Google Sign-in redirect
                const result = await getRedirectResult(auth);
                if (result) {
                    // This will trigger onAuthStateChanged again with the new user
                    // No need to setLoading(false) here, the next cycle will handle it
                    return; 
                }
            } catch (error) {
                console.error("Error getting redirect result:", error);
            }
            // If no user and no redirect result, they are truly logged out.
            setUser(null);
            setSubscription(null);
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // This effect handles subscription state once we have a user.
    if (!user) {
        // If user becomes null (logout), we stop loading.
        // The redirection logic will handle sending them to /login
        if (!loading) setLoading(false);
        return;
    };

    const subscriptionsColRef = collection(db, 'customers', user.uid, 'subscriptions');
    const unsubscribeSubscriptions = onSnapshot(subscriptionsColRef, (snapshot) => {
      if (snapshot.empty) {
        setSubscription({ id: '', isActive: false });
        setLoading(false);
        return;
      }
      
      const activeSubscriptions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Subscription))
        .filter(sub => ['active', 'trialing'].includes(sub.status));

      if (activeSubscriptions.length > 0) {
        const sub = activeSubscriptions[0];
        setSubscription({ id: sub.id, isActive: true });
      } else {
        setSubscription({ id: '', isActive: false });
      }
      setLoading(false); // We have the user and their sub status, stop loading.
    }, (error) => {
        console.error("Erro ao buscar assinatura:", error);
        setSubscription({ id: '', isActive: false });
        setLoading(false);
    });

    return () => {
      unsubscribeSubscriptions();
    };
  }, [user, loading]);


  useEffect(() => {
    // This effect handles all redirection logic once loading is false.
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isSubscriptionPage = pathname.startsWith('/subscription');

    if (loading) return; // Do nothing while loading.

    if (!user && !isAuthPage) {
        router.replace('/login');
    } else if (user) {
        if (!subscription?.isActive && !isSubscriptionPage) {
             router.replace('/subscription');
        } else if (subscription?.isActive && (isAuthPage || isSubscriptionPage)) {
             router.replace('/dashboard');
        }
    }
  }, [user, subscription, loading, router, pathname]);

  return { user, subscription, loading, reloadUser };
}
