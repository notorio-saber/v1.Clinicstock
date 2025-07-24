'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-secondary">
      <Loader className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );
}
