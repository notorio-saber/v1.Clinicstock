'use client';

import Header from './_components/header';
import BottomNav from './_components/bottom-nav';
import useAuth from '@/hooks/useAuth';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, subscription, loading } = useAuth();
  
  if (loading || !user || !subscription?.isActive) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-secondary">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando credenciais e assinatura...</p>
      </div>
    );
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
