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
    const processAuth = async () => {
      // It's important to handle the redirect result first.
      try {
        await getRedirectResult(auth);
      } catch (error) {
        console.error("Auth: Error getting redirect result", error);
      }

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setLoading(true); // Set loading true whenever auth state changes
        if (firebaseUser) {
          setUser(firebaseUser);
          // Now that we have a user, listen for subscription changes.
          const subRef = collection(db, 'customers', firebaseUser.uid, 'subscriptions');
          const q = query(subRef, where("status", "in", ["trialing", "active"]));

          const unsubscribeSub = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
              setSubscription({ id: '', isActive: false });
            } else {
              const sub = snapshot.docs[0].data() as Subscription;
              setSubscription({ id: snapshot.docs[0].id, isActive: true });
            }
            setLoading(false); // Done loading after getting sub status
          }, (error) => {
            console.error("Auth: Error fetching subscription", error);
            // This is critical: if we have a permissions error, we must assume no subscription
            // and stop loading so the UI can react.
            setSubscription({ id: '', isActive: false });
            setLoading(false);
          });
          
          return () => unsubscribeSub(); // Cleanup subscription listener
        } else {
          // No user is signed in.
          setUser(null);
          setSubscription(null);
          setLoading(false);
        }
      });

      return () => unsubscribe(); // Cleanup auth state listener
    };

    processAuth();
  }, []);


  const value = { user, subscription, loading, reloadUser, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
