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
    // This is the core logic that handles auth state changes.
    // It runs once on mount.
    setLoading(true);
    
    // First, try to get the result of a potential redirect.
    // This is crucial for Google/social logins.
    getRedirectResult(auth)
      .then((result) => {
        // If a result exists, onAuthStateChanged will handle the new user state.
        // We don't need to do anything here, because the listener below will fire.
      })
      .catch((error) => {
        console.error("Auth: Error getting redirect result", error);
      })
      .finally(() => {
         // Now, set up the onAuthStateChanged listener.
         // This will run immediately with the current user, or when the user logs in/out.
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
            // User is signed in, check for their subscription.
            const subRef = collection(db, 'customers', firebaseUser.uid, 'subscriptions');
            const unsubscribeSub = onSnapshot(subRef, (snapshot) => {
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
            
            return () => unsubscribeSub();
          } else {
            // No user is signed in.
            setUser(null);
            setSubscription(null);
            setLoading(false);
          }
        });

        return () => unsubscribe();
      });

  }, []);

  const value = { user, subscription, loading, reloadUser, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}