import Link from 'next/link';
import { Box, AlertTriangle, DollarSign, Plus, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockProducts } from '@/lib/mock-data';
import type { Product } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';
import Image from 'next/image';

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
};

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl lg:text-3xl font-bold truncate">{value}</div>
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
  const totalProducts = mockProducts.length;
  const expiringSoon = mockProducts.filter(p => {
    const days = differenceInDays(parseISO(p.expiryDate), new Date());
    return days >= 0 && days <= 30;
  }).length;
  const lowStock = mockProducts.filter(p => p.currentStock <= p.minimumStock).length;
  const totalValue = mockProducts.reduce((sum, p) => sum + (p.costPrice || 0) * p.currentStock, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const nextExpiries = [...mockProducts]
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .filter(p => differenceInDays(parseISO(p.expiryDate), new Date()) >= 0)
    .slice(0, 5);

  return (
    <div className="relative space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Produtos" value={String(totalProducts)} icon={Box} color="text-blue-500" />
        <StatCard title="Vencendo em 30 dias" value={String(expiringSoon)} icon={AlertTriangle} color="text-orange-500" />
        <StatCard title="Estoque Baixo" value={String(lowStock)} icon={AlertTriangle} color="text-red-500" />
        <StatCard title="Valor do Estoque" value={totalValue} icon={DollarSign} color="text-green-500" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Próximos Vencimentos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {nextExpiries.map((product: Product) => {
               const status = getExpiryStatus(product.expiryDate);
              return(
              <li key={product.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Image src={product.photoURL} alt={product.name} width={40} height={40} className="rounded-full" data-ai-hint={product['data-ai-hint']}/>
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
