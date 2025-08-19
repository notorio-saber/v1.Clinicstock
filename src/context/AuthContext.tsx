
'use client';

import { useState, useEffect, createContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, getRedirectResult, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, Unsubscribe, doc, setDoc, getDoc } from 'firebase/firestore';
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
        const result = await getRedirectResult(auth);
        // This will be null if no redirect operation was in progress.
        // If it was, the onAuthStateChanged listener will handle the user object.
      } catch (error) {
        console.error("Auth: Error getting redirect result", error);
      }
    };
    handleRedirect();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // When a user signs in (or is already signed in), create their document in Firestore.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              // Any other initial data for the user
            };
            // Use setDoc with merge:true to be safe, though it's a new doc.
            await setDoc(userDocRef, userData, { merge: true });
        }
        
        setUser(firebaseUser);
      } else {
        setUser(null);
        setSubscriptionLoading(false); // If no user, no subscription to load
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    let unsubscribeSub: Unsubscribe | undefined;

    if (user) {
      setSubscriptionLoading(true);
      // The Stripe extension creates the 'customers' collection
      const subRef = collection(db, 'customers', user.uid, 'subscriptions');
      const q = query(subRef);

      unsubscribeSub = onSnapshot(q, (snapshot) => {
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
