'use client';

import { useState, useEffect, createContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, getRedirectResult, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, Unsubscribe } from 'firebase/firestore';
import type { Subscription } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  subscription: { id: string; isActive: boolean } | null;
  loading: boolean;
  reloadUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<{ id: string; isActive: boolean } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const router = useRouter();

  const reloadUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      // This will trigger the onAuthStateChanged listener below, which will update the user state.
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setSubscription(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error) {
        console.error("Auth: Error getting redirect result", error);
      }
    };
    handleRedirect();

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (!firebaseUser) {
        setSubscriptionLoading(false); // If no user, no subscription to load
      }
    });

    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    let unsubscribeSub: Unsubscribe | undefined;

    if (user) {
      setSubscriptionLoading(true);
      const subRef = collection(db, 'customers', user.uid, 'subscriptions');
      const q = query(subRef);

      // Explicitly listen to the server to avoid cache issues on re-login
      unsubscribeSub = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        if (!snapshot.metadata.fromCache) {
            if (snapshot.empty) {
                setSubscription({ id: '', isActive: false });
            } else {
                const subDoc = snapshot.docs[0];
                const sub = subDoc.data() as Subscription;
                const activeStatuses = ["trialing", "active"];
                const isActive = activeStatuses.includes(sub.status);
                setSubscription({ id: subDoc.id, isActive });
            }
            setSubscriptionLoading(false);
        }
      }, (error) => {
        console.error("Auth: Error fetching subscription.", error);
        setSubscription({ id: '', isActive: false });
        setSubscriptionLoading(false);
      });
    } else {
      setSubscription(null);
      setSubscriptionLoading(false);
    }

    return () => {
      if (unsubscribeSub) {
        unsubscribeSub();
      }
    };
  }, [user]);

  const value = { 
    user, 
    subscription, 
    loading: authLoading || subscriptionLoading,
    reloadUser, 
    logout 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
