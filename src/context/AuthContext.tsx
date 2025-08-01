'use client';

import { useState, useEffect, createContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, getRedirectResult, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
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
    // It's important to handle the redirect result first in case of Google Sign-in.
    const processAuth = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error) {
        console.error("Auth: Error getting redirect result", error);
      }

      // Main auth state listener
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setLoading(true); // Always start loading when auth state might change
        if (firebaseUser) {
          setUser(firebaseUser);
          
          // Now that we have a user, listen for subscription changes in the `customers` collection.
          const subRef = collection(db, 'customers', firebaseUser.uid, 'subscriptions');
          const q = query(subRef);

          const unsubscribeSub = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
              setSubscription({ id: '', isActive: false });
            } else {
              // Get the first subscription document.
              const subDoc = snapshot.docs[0];
              const sub = subDoc.data() as Subscription;
              
              // Define what statuses we consider as "active".
              const activeStatuses = ["trialing", "active"];
              const isActive = activeStatuses.includes(sub.status);
              
              setSubscription({ id: subDoc.id, isActive });
            }
            setLoading(false); // Done loading after getting subscription status
          }, (error) => {
            console.error("Auth: Error fetching subscription. This is often a permissions issue.", error);
            // If we have an error (e.g., permission denied), assume no active subscription.
            // This is a critical fallback to prevent users from getting stuck.
            setSubscription({ id: '', isActive: false });
            setLoading(false);
          });
          
          // Return the cleanup function for the subscription listener.
          return () => unsubscribeSub();
        } else {
          // No user is signed in.
          setUser(null);
          setSubscription(null);
          setLoading(false);
        }
      });

      // Return the cleanup function for the auth state listener.
      return () => unsubscribe();
    };

    processAuth();
  }, []);


  const value = { user, subscription, loading, reloadUser, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
