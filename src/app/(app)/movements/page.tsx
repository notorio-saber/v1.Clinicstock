import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { mockMovements } from '@/lib/mock-data';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function MovementsPage() {
  const filters = ['Todos', 'Entradas', 'Saídas', 'Por Período'];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Histórico de Movimentações</h2>
        <p className="text-muted-foreground">Veja todas as entradas e saídas do seu estoque.</p>
      </div>
      
      <div className="sticky top-16 bg-secondary/80 backdrop-blur-sm z-10 -mx-4 -mt-4 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Buscar por produto..." className="pl-10" />
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <Button key={filter} variant={filter === 'Todos' ? 'default' : 'outline'} className="whitespace-nowrap rounded-full">
              {filter}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="space-y-3">
        {mockMovements.map((movement) => {
          const isEntry = movement.type === 'entrada';
          return (
            <Card key={movement.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", isEntry ? 'bg-green-500/20' : 'bg-red-500/20')}>
                    {isEntry ? (
                      <ArrowUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowDown className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{movement.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(movement.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric'})}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <p className={cn("font-bold text-lg", isEntry ? 'text-green-500' : 'text-red-500')}>
                     {isEntry ? '+' : '-'} {movement.quantity}
                   </p>
                   <p className="text-sm text-muted-foreground">
                     Saldo: {movement.newStock}
                   </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
