'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import useAuth from '@/hooks/useAuth';

export default function RedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [router, user, loading]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-secondary">
      <Loader className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );
}
