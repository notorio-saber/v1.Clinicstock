
'use client';

import { useState, useEffect, createContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, getRedirectResult, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Subscription } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';

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
  const pathname = usePathname();

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
    // This effect should only run once to set up the listener and check for redirect result.
    // It's crucial to handle the entire auth flow to prevent race conditions.
    
    // First, check for the result of a redirect authentication
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User has successfully signed in via redirect.
          // onAuthStateChanged will handle setting the user state.
          // We don't need to do anything here as the listener will fire.
        }
      })
      .catch((error) => {
        // Handle Errors here.
        console.error("Error getting redirect result:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if(user && firebaseUser.uid === user.uid) {
            // User is already set, no need to re-run everything
            setLoading(false);
            return;
        }
        setUser(firebaseUser);
        
        // User is signed in, now check for their subscription.
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
          setLoading(false); // Auth flow is complete for a signed-in user
        }, (error) => {
          console.error("Error fetching subscription:", error);
          setSubscription({ id: '', isActive: false });
          setLoading(false); // Still complete, but with an error state for subscription
        });
        
        return () => unsubscribeSub();

      } else {
        // No user is signed in.
        setUser(null);
        setSubscription(null);
        setLoading(false); // Auth flow is complete for a signed-out user
      }
    });

    return () => unsubscribe(); // Cleanup the auth state listener
  }, []); // Empty dependency array ensures this runs only once

  const value = { user, subscription, loading, reloadUser, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
