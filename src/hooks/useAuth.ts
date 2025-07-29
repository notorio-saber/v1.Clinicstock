'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Subscription } from '@/lib/types';
import { useToast } from './use-toast';


export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<{ id: string; isActive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const reloadUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // This is the primary auth state listener.
      // It runs whenever the auth state changes (login, logout).
      
      // First, handle the redirect result from Google Sign-In.
      // This should be done regardless of whether currentUser is initially present.
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // If we have a result, a sign-in just completed.
          // onAuthStateChanged will be re-triggered with the new user.
          // We can set the user here to speed up UI update.
          setUser(result.user);
          toast({ title: 'Login bem-sucedido!' });
        }
      } catch (error: any) {
        console.error("Error getting redirect result:", error);
        toast({ variant: "destructive", title: "Erro no Login", description: "Não foi possível completar o login com Google."});
        setLoading(false); // Stop loading on error
      }
      
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        setSubscription(null);
        // If there's no user and we've already checked for a redirect result,
        // it's safe to stop loading.
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    // This effect manages the subscription state whenever the user object changes.
    if (!user) {
      // If user is null, there's no subscription to check.
      // The loading state should have been handled by the auth listener.
      return;
    }

    const subscriptionsColRef = collection(db, 'customers', user.uid, 'subscriptions');
    const unsubscribeSubscriptions = onSnapshot(subscriptionsColRef, (snapshot) => {
      if (snapshot.empty) {
        setSubscription({ id: '', isActive: false });
        setLoading(false); // Stop loading, we have the final subscription state.
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
      setLoading(false); // Stop loading, we have the user and their sub status.
    }, (error) => {
        console.error("Erro ao buscar assinatura:", error);
        setSubscription({ id: '', isActive: false });
        setLoading(false); // Stop loading on error.
    });

    return () => unsubscribeSubscriptions();
  }, [user]);


  useEffect(() => {
    // This effect handles all page redirection logic.
    // It only runs when the loading state is finalized.
    if (loading) return; // Do nothing until all checks are complete.

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isSubscriptionPage = pathname.startsWith('/subscription');

    if (!user) {
      // Not logged in.
      if (!isAuthPage) {
        router.replace('/login');
      }
    } else {
      // Logged in.
      if (!subscription?.isActive) {
        // Logged in but no active subscription.
        if (!isSubscriptionPage) {
          router.replace('/subscription');
        }
      } else {
        // Logged in WITH active subscription.
        if (isAuthPage || isSubscriptionPage) {
          router.replace('/dashboard');
        }
      }
    }
  }, [user, subscription, loading, router, pathname]);

  return { user, subscription, loading, reloadUser };
}
