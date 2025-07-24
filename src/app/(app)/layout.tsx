'use client';

import Header from './_components/header';
import BottomNav from './_components/bottom-nav';
import useAuth from '@/hooks/useAuth';
import { Loader } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  return (
    <div className="flex h-screen flex-col bg-secondary">
      <Header />
      <main className="flex-1 overflow-y-auto pt-16 pb-24">
        <div className="container mx-auto max-w-3xl p-4">
            {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
