'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
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
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
        setLoading(false); // If no user, not loading anymore
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      // If user is null, loading is already set to false by the auth listener
      return;
    }

    // User is present, now check for subscription
    const subRef = collection(db, 'customers', user.uid, 'subscriptions');
    const unsubscribeSub = onSnapshot(subRef, (snapshot) => {
      if (snapshot.empty) {
        setSubscription({ id: '', isActive: false });
        setLoading(false);
        return;
      }

      const activeSubscriptions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Subscription))
        .filter(sub => ['active', 'trialing'].includes(sub.status));
      
      if (activeSubscriptions.length > 0) {
        setSubscription({ id: activeSubscriptions[0].id, isActive: true });
      } else {
        setSubscription({ id: '', isActive: false });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching subscription:", error);
      setSubscription({ id: '', isActive: false });
      setLoading(false);
    });

    return () => unsubscribeSub();
  }, [user]);

  useEffect(() => {
    if (loading) {
      return; // Do nothing until loading is false
    }

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isSubscriptionPage = pathname.startsWith('/subscription');

    if (!user) {
      // Not logged in
      if (!isAuthPage) {
        router.replace('/login');
      }
    } else {
      // Logged in
      if (subscription && subscription.isActive) {
        // Has active subscription, should be in the app
        if (isAuthPage || isSubscriptionPage) {
          router.replace('/dashboard');
        }
      } else {
        // Does not have active subscription
        if (!isSubscriptionPage) {
          router.replace('/subscription');
        }
      }
    }
  }, [user, subscription, loading, router, pathname]);

  return { user, subscription, loading, reloadUser };
}
