'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const reloadUser = async () => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }
  }

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
      
      if (!currentUser && !isAuthPage) {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  return { user, loading, reloadUser };
}
