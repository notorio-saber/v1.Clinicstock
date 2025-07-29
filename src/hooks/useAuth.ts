'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
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
    const processRedirectResult = async () => {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                // Usuário acabou de logar via redirect. O onAuthStateChanged vai lidar com o estado.
                // Aqui você pode adicionar lógica específica se precisar dos dados do `result`
            }
        } catch (error) {
            console.error("Erro ao obter resultado do redirecionamento:", error);
        } finally {
            // Após processar o redirect, a lógica principal pode continuar
             const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
              if (currentUser) {
                setUser(currentUser);
              } else {
                setUser(null);
                setSubscription(null);
                setLoading(false);
              }
            });
            // O unsubscribe será chamado no retorno do useEffect principal
            return unsubscribeAuth;
        }
    };
    
    const unsubscribePromise = processRedirectResult();

    return () => {
        unsubscribePromise.then(unsubscribe => {
            if (unsubscribe) {
                unsubscribe();
            }
        });
    };
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
    }, (error) => {
        console.error("Erro ao buscar assinatura:", error);
        setLoading(false);
    });

    return () => {
      unsubscribeSubscriptions();
    };
  }, [user]);


  useEffect(() => {
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isSubscriptionPage = pathname.startsWith('/subscription');

    if (loading) return; // Não faça nada enquanto carrega

    if (!user && !isAuthPage) {
        router.replace('/login');
    } else if (user && !subscription?.isActive && !isSubscriptionPage) {
        router.replace('/subscription');
    } else if (user && subscription?.isActive && (isAuthPage || isSubscriptionPage)) {
        router.replace('/dashboard');
    }
  }, [user, subscription, loading, router, pathname]);

  return { user, subscription, loading, reloadUser };
}
