'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuth from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, Search, Package, FileDown } from 'lucide-react';
import type { StockMovement } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function MovementDetailsDialog({ movement }: { movement: StockMovement }) {
    const isEntry = movement.type === 'entrada';

    const detailItem = (label: string, value?: string | number | null) => {
        if (!value && value !== 0) return null;
        let displayValue: React.ReactNode = value;
        if (label === "Novo Preço de Custo" && typeof value === 'number' && value > 0) {
             displayValue = `R$ ${value.toFixed(2).replace('.',',')}`;
        }
        if (label === "Nova Data de Validade" && typeof value === 'string') {
            displayValue = new Date(value).toLocaleDateString('pt-BR');
        }

        return (
            <div className="py-2">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{displayValue}</p>
            </div>
        )
    }

    return (
        <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Detalhes da Movimentação</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-2">
                <div className={cn("flex items-center gap-4 p-4 rounded-lg", isEntry ? 'bg-green-500/10' : 'bg-red-500/10')}>
                     <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", isEntry ? 'bg-green-500/20' : 'bg-red-500/20')}>
                        {isEntry ? ( <ArrowUp className="h-5 w-5 text-green-500" /> ) : ( <ArrowDown className="h-5 w-5 text-red-500" /> )}
                    </div>
                    <div>
                        <p className="font-bold text-lg">{movement.productName}</p>
                        <p className={cn("font-semibold", isEntry ? 'text-green-600' : 'text-red-600')}>
                            {isEntry ? 'ENTRADA' : 'SAÍDA'} DE {movement.quantity} {movement.quantity > 1 ? 'UNIDADES' : 'UNIDADE'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 divide-y">
                    {detailItem("Data", new Date(movement.date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short'}))}
                    {detailItem("Motivo", movement.reason)}
                    {detailItem("Responsável", movement.professionalName)}
                    {detailItem("Estoque Anterior", movement.previousStock)}
                    {detailItem("Estoque Resultante", movement.newStock)}
                </div>

                {isEntry && (
                    <>
                        <div className="grid grid-cols-2 gap-x-4 divide-y pt-2">
                            {detailItem("Nova Data de Validade", movement.newExpiryDate)}
                            {detailItem("Novo Lote", movement.newBatchNumber)}
                            {detailItem("Novo Preço de Custo", movement.newCostPrice)}
                        </div>
                    </>
                )}

                {movement.notes && (
                    <div className="space-y-1 pt-2">
                        <p className="text-sm text-muted-foreground">Observações</p>
                        <p className="text-sm rounded-md border bg-muted/50 p-3 whitespace-pre-wrap">{movement.notes}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    )
}

function MovementCard({ movement }: { movement: StockMovement }) {
    const isEntry = movement.type === 'entrada';
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
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
            </DialogTrigger>
            <MovementDetailsDialog movement={movement} />
        </Dialog>
    );
}

export default function MovementsPage() {
    const { user } = useAuth();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('Todos');

    const filters = ['Todos', 'Entradas', 'Saídas'];

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

    const filteredMovements = useMemo(() => {
        return movements.filter(movement => {
            const searchMatch = movement.productName.toLowerCase().includes(searchTerm.toLowerCase());
            if (!searchMatch) return false;

            if (activeFilter === 'Todos') return true;
            if (activeFilter === 'Entradas') return movement.type === 'entrada';
            if (activeFilter === 'Saídas') return movement.type === 'saida';

            return true;
        });
    }, [movements, searchTerm, activeFilter]);

    const handleExportCSV = async () => {
        const { unparse } = await import('papaparse');
        const dataToExport = filteredMovements.map(m => ({
            "Data": new Date(m.date).toLocaleString('pt-BR'),
            "Produto": m.productName,
            "Tipo": m.type === 'entrada' ? 'Entrada' : 'Saída',
            "Quantidade": m.quantity,
            "Motivo": m.reason,
            "Profissional Responsável": m.professionalName || '',
            "Estoque Anterior": m.previousStock,
            "Estoque Resultante": m.newStock,
            "Lote (Entrada)": m.newBatchNumber || '',
            "Validade (Entrada)": m.newExpiryDate ? new Date(m.newExpiryDate).toLocaleDateString('pt-BR') : '',
            "Custo (Entrada)": m.newCostPrice ? m.newCostPrice.toFixed(2) : '',
            "Observações": m.notes || '',
        }));

        const csv = unparse(dataToExport);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) {
            URL.revokeObjectURL(link.href);
        }
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `historico_movimentacoes_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderContent = () => {
        if (loading) {
            return (
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
            );
        }

        if (movements.length === 0) {
             return (
                <div className="text-center py-16">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhuma movimentação registrada</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Adicione produtos ou registre entradas e saídas para ver o histórico.</p>
                </div>
            )
        }
        
        if (filteredMovements.length === 0) {
            return (
                <div className="text-center py-16">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhum resultado encontrado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Tente ajustar sua busca ou filtros.</p>
                </div>
            )
        }

        return (
            <div className="space-y-3">
                {filteredMovements.map((movement) => (
                    <MovementCard key={movement.id} movement={movement} />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Histórico de Movimentações</h2>
                    <p className="text-muted-foreground">Veja todas as entradas e saídas do seu estoque.</p>
                </div>
                 <Button variant="outline" onClick={handleExportCSV} disabled={filteredMovements.length === 0} className="flex-shrink-0">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </div>

            <div className="sticky top-16 z-10 bg-secondary/95 backdrop-blur-sm py-3 border-b">
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por produto..." 
                            className="pl-10" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {filters.map((filter) => (
                            <Button 
                                key={filter} 
                                variant={activeFilter === filter ? 'default' : 'outline'} 
                                className="whitespace-nowrap rounded-full"
                                onClick={() => setActiveFilter(filter)}
                            >
                                {filter}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-4">
                {renderContent()}
            </div>
        </div>
    );
}
