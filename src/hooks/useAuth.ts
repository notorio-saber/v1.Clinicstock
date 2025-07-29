'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import type { Subscription } from '@/lib/types';

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<{ id: string; isActive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const reloadUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }
  }, []);

  useEffect(() => {
    console.log("useAuth: Hook mounted. Setting up auth state listener.");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("useAuth: onAuthStateChanged triggered.", { hasUser: !!firebaseUser });
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Check for subscription
        const subRef = collection(db, 'customers', firebaseUser.uid, 'subscriptions');
        const unsubscribeSub = onSnapshot(subRef, (snapshot) => {
          console.log("useAuth: Subscription snapshot received.", { empty: snapshot.empty });
          const activeSubscriptions = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Subscription))
            .filter(sub => ['active', 'trialing'].includes(sub.status));
          
          if (activeSubscriptions.length > 0) {
            console.log("useAuth: Active subscription found.");
            setSubscription({ id: activeSubscriptions[0].id, isActive: true });
          } else {
            console.log("useAuth: No active subscription found.");
            setSubscription({ id: '', isActive: false });
          }
          setLoading(false);
        }, (error) => {
          console.error("useAuth: Error fetching subscription:", error);
          setSubscription({ id: '', isActive: false });
          setLoading(false);
        });
        return () => unsubscribeSub(); // Cleanup subscription listener
      } else {
        // No user is signed in. Check for redirect result.
        try {
            console.log("useAuth: No user, checking for redirect result...");
            const result = await getRedirectResult(auth);
            if (result) {
                console.log("useAuth: getRedirectResult successful, user found.", result.user);
                // This will trigger onAuthStateChanged again with the new user.
                // setLoading will be handled in the next run of the effect.
            } else {
                console.log("useAuth: No user and no redirect result. Finalizing auth state.");
                setUser(null);
                setSubscription(null);
                setLoading(false);
            }
        } catch (error) {
            console.error("useAuth: Error during getRedirectResult", error);
            setUser(null);
            setSubscription(null);
            setLoading(false);
        }
      }
    });

    return () => {
      console.log("useAuth: Hook unmounting. Cleaning up auth listener.");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log("useAuth: Redirect logic check", { loading, user: !!user, subscription, pathname });

    if (loading) {
      console.log("useAuth: Still loading, skipping redirect logic.");
      return;
    }

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isSubscriptionPage = pathname.startsWith('/subscription');

    if (!user) {
      console.log("useAuth: No user. Should be on auth page.");
      if (!isAuthPage) {
        console.log("useAuth: Not on auth page, redirecting to /login.");
        router.replace('/login');
      }
    } else {
      console.log("useAuth: User is present.");
      if (subscription?.isActive) {
        console.log("useAuth: User has active subscription.");
        if (isAuthPage || isSubscriptionPage) {
          console.log("useAuth: On auth/sub page, redirecting to /dashboard.");
          router.replace('/dashboard');
        }
      } else {
        console.log("useAuth: User does not have active subscription.");
        if (!isSubscriptionPage) {
          console.log("useAuth: Not on sub page, redirecting to /subscription.");
          router.replace('/subscription');
        }
      }
    }
  }, [user, subscription, loading, router, pathname]);

  return { user, subscription, loading, reloadUser };
}
