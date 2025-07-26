'use client';

import { useState, useEffect } from 'react';
import type { Product, StockMovement } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PackagePlus, Trash2, XCircle, Loader2, AlertTriangle, Save } from 'lucide-react';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import useAuth from '@/hooks/useAuth';
import { collection, onSnapshot, query, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';


type AlertType = 'expired' | 'expiring_7' | 'expiring_30' | 'low_stock';

const alertConfig = {
    expired: { title: 'Produtos Vencidos', icon: XCircle, color: 'text-red-500' },
    expiring_7: { title: 'Vencendo em 7 dias', icon: AlertTriangle, color: 'text-red-500' },
    expiring_30: { title: 'Vencendo em 30 dias', icon: AlertTriangle, color: 'text-orange-500' },
    low_stock: { title: 'Estoque Baixo', icon: AlertTriangle, color: 'text-orange-500' },
};

function MovementForm({ product, onFinished }: { product: Product, onFinished: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user) return;

        const formData = new FormData(event.currentTarget);
        const quantity = parseInt(formData.get('quantity') as string, 10);
        const notes = formData.get('notes') as string;

        if (isNaN(quantity) || quantity <= 0) {
            toast({ variant: 'destructive', title: 'Erro', description: 'A quantidade deve ser um número positivo.' });
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const productDocRef = doc(db, `users/${user.uid}/products`, product.id);
            
            const previousStock = product.currentStock;
            const newStock = previousStock + quantity;

            batch.update(productDocRef, { currentStock: newStock });

            const movementCollectionRef = collection(db, `users/${user.uid}/movements`);
            const newMovementRef = doc(movementCollectionRef);
            const movementData: Omit<StockMovement, 'id'> = {
                productId: product.id,
                productName: product.name,
                type: 'entrada',
                quantity,
                reason: 'Entrada Manual',
                date: new Date().toISOString(),
                previousStock,
                newStock,
                notes,
            };
            batch.set(newMovementRef, movementData);
            
            await batch.commit();

            toast({
                title: 'Sucesso!',
                description: 'Movimentação de entrada registrada.',
                className: 'bg-green-500 text-white',
            });
            onFinished();

        } catch (error) {
            console.error("Erro ao registrar movimentação: ", error);
            toast({ variant: 'destructive', title: 'Erro na Transação', description: "Não foi possível registrar a movimentação." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
             <SheetHeader className='text-left'>
                <SheetTitle>Registrar Entrada: {product.name}</SheetTitle>
                <SheetDescription>Adicione novas unidades ao estoque deste produto.</SheetDescription>
            </SheetHeader>
            <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input id="quantity" name="quantity" type="number" placeholder="0" required min="1"/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes">Observações (Opcional)</Label>
                <Textarea id="notes" name="notes" placeholder="Ex: Compra de emergência" />
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Entrada
            </Button>
        </form>
    )
}


function AlertCard({ product }: { product: Product }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleDiscard = async () => {
        if (!user || !product) return;

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const productDocRef = doc(db, `users/${user.uid}/products`, product.id);
            const previousStock = product.currentStock;

            batch.update(productDocRef, { currentStock: 0 });

            if (previousStock > 0) {
                 const movementRef = doc(collection(db, `users/${user.uid}/movements`));
                 const movementData: Omit<StockMovement, 'id'> = {
                     productId: product.id,
                     productName: product.name,
                     type: 'saida',
                     quantity: previousStock,
                     reason: 'Vencimento',
                     date: new Date().toISOString(),
                     previousStock,
                     newStock: 0,
                     notes: 'Produto descartado por vencimento ou alerta.',
                 };
                 batch.set(movementRef, movementData);
            }

            await batch.commit();

            toast({
                title: 'Sucesso!',
                description: 'Produto descartado e estoque zerado.',
                className: 'bg-green-500 text-white',
            });

        } catch (error) {
            console.error("Erro ao descartar produto: ", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível descartar o produto.' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Card className="mb-3">
            <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                    <Image src={product.photoURL} alt={product.name} width={48} height={48} className="rounded-md" data-ai-hint={product['data-ai-hint']} />
                    <div className="flex-1">
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                            Estoque: {product.currentStock} | Val: {new Date(product.expiryDate).toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                           <Button variant="outline" size="sm"><PackagePlus className="mr-1 h-3 w-3"/> Entrada</Button>
                        </SheetTrigger>
                        <SheetContent>
                            <MovementForm product={product} onFinished={() => setIsSheetOpen(false)} />
                        </SheetContent>
                    </Sheet>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={product.currentStock === 0}>
                                <Trash2 className="mr-1 h-3 w-3"/> Descartar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Descartar todo o estoque?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação zerará o estoque de <span className="font-semibold">{product.name}</span> (quantidade: {product.currentStock}). 
                                    A movimentação será registrada como "Vencimento".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDiscard} disabled={isSaving}>
                                    {isSaving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                                    Confirmar Descarte
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AlertsPage() {
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

    const getAlerts = () => {
        const alerts: Record<AlertType, Product[]> = {
            expired: [],
            expiring_7: [],
            expiring_30: [],
            low_stock: [],
        };

        const uniqueProducts = new Map<string, Product>();

        products.forEach(p => {
             const daysToExpiry = differenceInDays(parseISO(p.expiryDate), new Date());
             let hasAlert = false;

            if (p.currentStock <= p.minimumStock && p.currentStock > 0) {
                if(!uniqueProducts.has(p.id)) uniqueProducts.set(p.id, p);
                alerts.low_stock.push(p);
                hasAlert = true;
            }
            if (daysToExpiry < 0) {
                 if(!uniqueProducts.has(p.id)) uniqueProducts.set(p.id, p);
                alerts.expired.push(p);
                hasAlert = true;
            } else if (daysToExpiry <= 7) {
                 if(!uniqueProducts.has(p.id)) uniqueProducts.set(p.id, p);
                alerts.expiring_7.push(p);
                hasAlert = true;
            } else if (daysToExpiry <= 30) {
                 if(!uniqueProducts.has(p.id)) uniqueProducts.set(p.id, p);
                alerts.expiring_30.push(p);
                hasAlert = true;
            }
        });
        
        // Remove duplicates from each alert category. A product can be in low stock AND expiring.
        alerts.expired = [...new Map(alerts.expired.map(item => [item['id'], item])).values()];
        alerts.expiring_7 = [...new Map(alerts.expiring_7.map(item => [item['id'], item])).values()];
        alerts.expiring_30 = [...new Map(alerts.expiring_30.map(item => [item['id'], item])).values()];
        alerts.low_stock = [...new Map(alerts.low_stock.map(item => [item['id'], item])).values()];

        return alerts;
    };
    
    const alerts = getAlerts();
    const alertOrder: AlertType[] = ['expired', 'expiring_7', 'expiring_30', 'low_stock'];
    const totalAlerts = alertOrder.reduce((sum, type) => sum + alerts[type].length, 0);

  return (
    <div className="space-y-4">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Alertas do Estoque</h2>
            <p className="text-muted-foreground">Ações necessárias para manter seu estoque saudável.</p>
        </div>
        
        {loading ? (
             <div className="space-y-4 pt-4">
                 <Skeleton className="h-24 w-full rounded-lg" />
                 <Skeleton className="h-24 w-full rounded-lg" />
             </div>
        ) : totalAlerts === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                    <AlertTriangle className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Tudo em ordem!</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Nenhum alerta de estoque baixo ou vencimento próximo.
                </p>
            </div>
        ) : (
            <Accordion type="multiple" defaultValue={alertOrder.filter(type => alerts[type].length > 0)} className="w-full space-y-4">
                {alertOrder.map(type => {
                    const config = alertConfig[type];
                    const products = alerts[type];
                    if (products.length === 0) return null;

                    return (
                        <AccordionItem key={type} value={type} className="border rounded-lg bg-card overflow-hidden">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <config.icon className={`h-6 w-6 ${config.color}`} />
                                    <span className="font-semibold">{config.title}</span>
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white ${config.color.startsWith('text-red') ? 'bg-red-500' : 'bg-orange-500'}`}>
                                        {products.length}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 border-t">
                                {products.map(product => (
                                    <AlertCard key={product.id} product={product} />
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        )}
    </div>
  );
}
