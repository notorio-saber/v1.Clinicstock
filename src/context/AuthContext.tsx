'use client';

import { useState, useEffect, createContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, getRedirectResult, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const reloadUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setSubscription(null);
    router.push('/login');
  },[router]);

  useEffect(() => {
    const processAuth = async () => {
        // First, check for redirect result to handle Google sign-in
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                // User signed in or linked via redirect.
                // onAuthStateChanged will handle the user state.
            }
        } catch (error) {
            console.error("Auth: Error getting redirect result", error);
        }

        // Set up the main auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const subRef = collection(db, 'customers', firebaseUser.uid, 'subscriptions');
                
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
                    console.error("Auth: Error fetching subscription", error);
                    setSubscription({ id: '', isActive: false });
                    setLoading(false);
                });
                
                // We return the subscription unsubscriber to be called on cleanup
                return () => unsubscribeSub();

            } else {
                setUser(null);
                setSubscription(null);
                setLoading(false);
            }
        });

        // Cleanup the main auth state listener
        return () => unsubscribe();
    };

    processAuth();
  }, []);

  const value = { user, subscription, loading, reloadUser, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
