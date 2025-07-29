'use client';

import Header from './_components/header';
import BottomNav from './_components/bottom-nav';
import useAuth from '@/hooks/useAuth';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SubscriptionModal from './subscription/page';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, subscription, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);


  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-secondary">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }

  if (!user) {
    return null; // O hook useAuth já vai redirecionar
  }

  // Se o usuário está logado mas não tem uma assinatura ativa, mostre a página de assinatura.
  if (!subscription?.isActive) {
      return <SubscriptionModal />;
  }

  return (
    <div className="flex h-screen flex-col bg-secondary">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-3xl p-4 pt-20 pb-24">
            {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
