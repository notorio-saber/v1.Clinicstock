'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuth from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, Search, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StockMovement } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function MovementCard({ movement }: { movement: StockMovement }) {
    const isEntry = movement.type === 'entrada';
    return (
        <Card>
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
                            {new Date(movement.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
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
}

export default function MovementsPage() {
    const filters = ['Todos', 'Entradas', 'Saídas', 'Por Período'];
    const { user } = useAuth();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const movementsCollectionRef = collection(db, `users/${user.uid}/movements`);
        const q = query(movementsCollectionRef, orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const movementsData: StockMovement[] = [];
            querySnapshot.forEach((doc) => {
                movementsData.push({ ...doc.data(), id: doc.id } as StockMovement);
            });
            setMovements(movementsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching movements: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

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

            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                                <div className="space-y-2 text-right">
                                    <Skeleton className="h-5 w-12 ml-auto" />
                                    <Skeleton className="h-3 w-16 ml-auto" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : movements.length === 0 ? (
                <div className="text-center py-16">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhuma movimentação registrada</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Adicione produtos ou registre entradas e saídas para ver o histórico.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {movements.map((movement) => (
                        <MovementCard key={movement.id} movement={movement} />
                    ))}
                </div>
            )}
        </div>
    );
}
