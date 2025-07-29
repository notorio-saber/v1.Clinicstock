'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import type { Subscription } from '@/lib/types';


export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<{ id: string; isActive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };

    const subscriptionsColRef = collection(db, 'customers', user.uid, 'subscriptions');
    const unsubscribeSubscriptions = onSnapshot(subscriptionsColRef, (snapshot) => {
      if (snapshot.empty) {
        setSubscription({ id: '', isActive: false });
        setLoading(false);
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
      setLoading(false);
    });

    return () => {
      unsubscribeSubscriptions();
    };
  }, [user]);


  useEffect(() => {
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    if (!loading && !user && !isAuthPage) {
        router.replace('/login');
    }
  }, [user, loading, router, pathname]);

  return { user, subscription, loading, reloadUser };
}
