import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { mockProducts } from '@/lib/mock-data';
import type { Product } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { differenceInDays, parseISO } from 'date-fns';
import { MoreVertical, Edit, ArrowUp, ArrowDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const getStatus = (product: Product): { text: string; className: string } => {
    const daysToExpiry = differenceInDays(parseISO(product.expiryDate), new Date());
    if (daysToExpiry < 0) return { text: 'Vencido', className: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (product.currentStock <= product.minimumStock) return { text: 'Estoque Baixo', className: 'bg-orange-500/20 text-orange-500 border-orange-500/30' };
    if (daysToExpiry <= 30) return { text: 'Vencendo', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' };
    return { text: 'Estoque OK', className: 'bg-green-500/20 text-green-500 border-green-500/30' };
};

function ProductCard({ product }: { product: Product }) {
  const status = getStatus(product);
  const daysToExpiry = differenceInDays(parseISO(product.expiryDate), new Date());
  
  let expiryColor = 'text-green-500';
  if (daysToExpiry < 7) expiryColor = 'text-red-500';
  else if (daysToExpiry <= 30) expiryColor = 'text-orange-500';

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <Image src={product.photoURL} alt={product.name} width={64} height={64} className="rounded-full" data-ai-hint={product['data-ai-hint']} />
        <div className="flex-1 space-y-1">
          <div className="flex justify-between">
            <h3 className="font-semibold">{product.name}</h3>
             <Badge variant="outline" className={status.className}>{status.text}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{product.category}</p>
          <div className="flex items-center gap-4 text-sm">
            <span>Estoque: <span className="font-medium">{product.currentStock} / min: {product.minimumStock}</span></span>
            <span className={expiryColor}>
              Val: {new Date(product.expiryDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                <DropdownMenuItem><ArrowUp className="mr-2 h-4 w-4 text-green-500"/>Registrar Entrada</DropdownMenuItem>
                <DropdownMenuItem><ArrowDown className="mr-2 h-4 w-4 text-red-500"/>Registrar Saída</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}

export default function ProductsPage() {
  const filters = ['Todos', 'Vencendo', 'Estoque Baixo', 'Injetáveis', 'Descartáveis'];
  return (
    <div className="space-y-4">
      <div className="sticky top-16 bg-secondary/80 backdrop-blur-sm z-10 -mx-4 -mt-4 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Buscar produtos..." className="pl-10" />
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
        {mockProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
