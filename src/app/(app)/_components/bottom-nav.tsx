'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Boxes, ArrowRightLeft, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import useAuth from '@/hooks/useAuth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Produtos', icon: Boxes },
  { href: '/movements', label: 'Movimentos', icon: ArrowRightLeft },
  { href: '/alerts', label: 'Alertas', icon: Bell },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasAlerts, setHasAlerts] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const productsCollectionRef = collection(db, `users/${user.uid}/products`);
    const q = query(productsCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let showAlert = false;
        querySnapshot.forEach((doc) => {
            const p = doc.data() as Product;
            const daysToExpiry = differenceInDays(parseISO(p.expiryDate), new Date());
            if (daysToExpiry < 30 || (p.currentStock <= p.minimumStock && p.currentStock > 0)) {
                showAlert = true;
            }
        });
        setHasAlerts(showAlert);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card">
      <div className="container mx-auto grid h-[72px] max-w-3xl grid-cols-4 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.href === '/alerts' && hasAlerts && (
                <span className="absolute top-3 right-1/2 translate-x-[18px] flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
              <item.icon
                className="h-6 w-6"
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
