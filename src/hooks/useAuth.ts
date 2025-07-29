'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import type { Subscription } from '@/lib/types';
import { useToast } from './use-toast';


export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<{ id: string; isActive: boolean } | null>(null);
  const [loading, setLoading] = useState(true); // Inicia como true
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
    // Esta é a função principal que escuta as mudanças de autenticação
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Este listener é chamado quando o usuário faz login, logout,
      // ou quando a página é carregada e o Firebase verifica a sessão.
      setUser(user);
      if (!user) {
        // Se não houver usuário, não precisamos verificar a assinatura.
        // Podemos definir o carregamento como falso.
        setLoading(false);
      }
    });

    // Separadamente, ao carregar, verificamos se há um resultado de redirect
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // Se houver um resultado, o login por redirecionamento acabou de acontecer.
          // O onAuthStateChanged acima já terá sido (ou será em breve) acionado
          // com o `result.user`. Podemos mostrar um toast de sucesso.
          toast({ title: 'Login bem-sucedido!' });
        }
      })
      .catch((error) => {
        console.error("Error getting redirect result:", error);
        toast({ variant: "destructive", title: "Erro no Login", description: "Não foi possível completar o login."});
      });
      
    return () => unsubscribeAuth();
  }, [toast]);


  useEffect(() => {
    // Este efeito lida com a verificação da assinatura.
    // Ele é acionado sempre que o objeto `user` muda.
    if (user) {
      const subRef = collection(db, 'customers', user.uid, 'subscriptions');
      const unsubscribeSub = onSnapshot(subRef, (snapshot) => {
        if (snapshot.empty) {
          setSubscription({ id: '', isActive: false });
          setLoading(false); // Carregamento concluído
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
        setLoading(false); // Carregamento concluído
      }, (error) => {
        console.error("Erro ao buscar assinatura:", error);
        setSubscription({ id: '', isActive: false });
        setLoading(false); // Carregamento concluído (com erro)
      });

      return () => unsubscribeSub();
    } else {
      // Se não houver usuário, a assinatura é nula e o carregamento já foi definido como falso
      // no `onAuthStateChanged`.
      setSubscription(null);
    }
  }, [user]);


  useEffect(() => {
    // Este efeito lida com TODOS os redirecionamentos.
    // Ele só roda quando o estado de carregamento principal é finalizado.
    if (loading) {
      return; // Não faz nada até que todas as verificações estejam completas.
    }

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isSubscriptionPage = pathname.startsWith('/subscription');

    if (!user) {
      // Se não há usuário logado, deve ir para a página de login,
      // a menos que já esteja em uma página de autenticação.
      if (!isAuthPage) {
        router.replace('/login');
      }
    } else {
      // Se há um usuário logado...
      if (!subscription?.isActive) {
        // ...mas ele não tem uma assinatura ativa, deve ir para a página de assinatura,
        // a menos que já esteja lá.
        if (!isSubscriptionPage) {
          router.replace('/subscription');
        }
      } else {
        // ...e ele TEM uma assinatura ativa, deve ir para o dashboard,
        // caso esteja em uma página de autenticação ou de assinatura.
        if (isAuthPage || isSubscriptionPage) {
          router.replace('/dashboard');
        }
      }
    }
  }, [user, subscription, loading, router, pathname]);

  return { user, subscription, loading, reloadUser };
}
