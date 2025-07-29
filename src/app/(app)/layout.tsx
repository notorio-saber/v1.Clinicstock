'use client';

import Header from './_components/header';
import BottomNav from './_components/bottom-nav';
import useAuth from '@/hooks/useAuth';
import { Loader } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, subscription, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait for the auth state to be determined

    if (!user) {
      router.replace('/login');
      return;
    }
    
    // Only check for subscription if the user is authenticated
    if (user && !subscription?.isActive) {
        // Allow access to profile page even without subscription
        if (pathname !== '/profile') {
           router.replace('/subscription');
        }
    }

  }, [user, subscription, loading, router, pathname]);
  
  // While loading, or if user is null and we are about to redirect, show a loader.
  // Or if user is present but subscription isn't active and we are about to redirect.
  if (loading || !user || (!subscription?.isActive && pathname !== '/profile')) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-secondary">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando credenciais...</p>
      </div>
    );
  }
  
  // If user and active subscription are present, render the app layout
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
