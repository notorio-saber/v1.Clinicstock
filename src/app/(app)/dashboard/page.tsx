'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Box, AlertTriangle, DollarSign, Plus, CalendarClock, Package, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';
import Image from 'next/image';
import useAuth from '@/hooks/useAuth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
};

function StatCard({ title, value, icon: Icon, color, loading }: StatCardProps) {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
            <Skeleton className="h-8 w-1/2" />
        ) : (
            <div className="text-2xl lg:text-3xl font-bold truncate">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function getExpiryStatus(expiryDate: string): { days: number; color: string; label: string } {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return { days, color: 'bg-red-500', label: 'Vencido' };
  if (days < 7) return { days, color: 'bg-red-500', label: `${days}d` };
  if (days <= 30) return { days, color: 'bg-orange-500', label: `${days}d` };
  return { days, color: 'bg-green-500', label: `${days}d` };
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const productsCollectionRef = collection(db, `users/${user.uid}/products`);
        const q = query(productsCollectionRef);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const productsData: Product[] = [];
            querySnapshot.forEach((doc) => {
                productsData.push({ ...doc.data(), id: doc.id } as Product);
            });
            setProducts(productsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching products: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

  const totalProducts = products.length;
  const expiringSoonCount = products.filter(p => {
    const days = differenceInDays(parseISO(p.expiryDate), new Date());
    return days >= 0 && days <= 30;
  }).length;
  const lowStock = products.filter(p => p.currentStock <= p.minimumStock && p.currentStock > 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.costPrice || 0) * p.currentStock, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const nextExpiries = [...products]
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .filter(p => differenceInDays(parseISO(p.expiryDate), new Date()) >= 0)
    .slice(0, 5);

  const hasUrgentExpiries = nextExpiries.some(p => differenceInDays(parseISO(p.expiryDate), new Date()) <= 30);

  return (
    <div className="relative space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Produtos" value={String(totalProducts)} icon={Box} color="text-blue-500" loading={loading} />
        <StatCard title="Vencendo em 30 dias" value={String(expiringSoonCount)} icon={AlertTriangle} color="text-orange-500" loading={loading} />
        <StatCard title="Estoque Baixo" value={String(lowStock)} icon={AlertTriangle} color="text-red-500" loading={loading} />
        <StatCard title="Valor do Estoque" value={totalValue} icon={DollarSign} color="text-green-500" loading={loading} />
      </div>

      <Card className={cn(hasUrgentExpiries && "border-red-500/50")}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Próximos Vencimentos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <ul className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <li key={i} className="flex items-center justify-between gap-4">
                         <div className="flex items-center gap-3">
                           <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                         </div>
                        <Skeleton className="h-6 w-12 rounded-full" />
                    </li>
                ))}
             </ul>
          ) : nextExpiries.length > 0 ? (
            <ul className="space-y-4">
                {nextExpiries.map((product: Product) => {
                   const status = getExpiryStatus(product.expiryDate);
                  return(
                  <li key={product.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Image src={product.photoURL} alt={product.name} width={40} height={40} className="rounded-full object-cover" data-ai-hint={product['data-ai-hint']}/>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`border-0 text-white ${status.color}`}>
                      {status.label}
                    </Badge>
                  </li>
                )})}
              </ul>
          ) : (
             <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">Nenhum produto com vencimento próximo.</p>
             </div>
          )}
        </CardContent>
      </Card>
      
      <Link href="/products/new" passHref>
        <Button className="fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full shadow-lg" size="icon">
          <Plus className="h-7 w-7" />
          <span className="sr-only">Adicionar Produto</span>
        </Button>
      </Link>
    </div>
  );
}
