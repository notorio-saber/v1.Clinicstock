'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuth from '@/hooks/useAuth';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MoreVertical, Edit, ArrowUp, ArrowDown, Package } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { differenceInDays, parseISO } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {Label} from "@/components/ui/label";
import { Skeleton } from '@/components/ui/skeleton';

const getStatus = (product: Product): { text: string; className: string } => {
    const daysToExpiry = differenceInDays(parseISO(product.expiryDate), new Date());
    if (daysToExpiry < 0) return { text: 'Vencido', className: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (product.currentStock <= product.minimumStock) return { text: 'Estoque Baixo', className: 'bg-orange-500/20 text-orange-500 border-orange-500/30' };
    if (daysToExpiry <= 30) return { text: 'Vencendo', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' };
    return { text: 'Estoque OK', className: 'bg-green-500/20 text-green-500 border-green-500/30' };
};

function RegisterEntryForm({product}: {product: Product}) {
    return (
        <form className="space-y-4 p-4">
            <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade a Adicionar</Label>
                <Input id="quantity" type="number" placeholder="0" required/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="cost">Novo Preço de Custo (R$)</Label>
                <Input id="cost" type="number" step="0.01" placeholder="0,00"/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="expiry-date">Nova Data de Validade</Label>
                <Input id="expiry-date" type="date"/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="batch">Novo Número do Lote</Label>
                <Input id="batch" placeholder="ABC1234"/>
            </div>
            <Button type="submit" className="w-full">Registrar Entrada</Button>
        </form>
    )
}


function ProductCard({ product }: { product: Product }) {
  const status = getStatus(product);
  const daysToExpiry = differenceInDays(parseISO(product.expiryDate), new Date());
  
  let expiryColor = 'text-green-500';
  if (daysToExpiry < 7) expiryColor = 'text-red-500';
  else if (daysToExpiry <= 30) expiryColor = 'text-orange-500';

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <Image src={product.photoURL} alt={product.name} width={64} height={64} className="rounded-full object-cover" data-ai-hint={product['data-ai-hint']} />
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
        <Sheet>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                    <SheetTrigger asChild>
                        <DropdownMenuItem><ArrowUp className="mr-2 h-4 w-4 text-green-500"/>Registrar Entrada</DropdownMenuItem>
                    </SheetTrigger>
                    <DropdownMenuItem><ArrowDown className="mr-2 h-4 w-4 text-red-500"/>Registrar Saída</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Registrar Entrada: {product.name}</SheetTitle>
                </SheetHeader>
                <RegisterEntryForm product={product} />
            </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  )
}

function ProductList() {
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

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-4 flex items-center gap-4">
                           <Skeleton className="h-16 w-16 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-16">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum produto cadastrado</h3>
                <p className="mt-1 text-sm text-muted-foreground">Comece a adicionar produtos para vê-los aqui.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}

export default function ProductsPage() {
  const filters = ['Todos', 'Vencendo', 'Estoque Baixo', 'Injetáveis', 'Descartáveis'];
  return (
    <div className="space-y-4">
      <div className="sticky top-16 bg-secondary/80 backdrop-blur-sm z-10 -mx-4 px-4 py-3 -mt-4 border-b">
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
      <ProductList />
    </div>
  );
}
