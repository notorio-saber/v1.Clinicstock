'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import Image from 'next/image';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MoreVertical, Edit, ArrowUp, ArrowDown, Package, Trash2, Loader2, Save, FileDown } from 'lucide-react';
import type { Product, StockMovement, StockMovementReason } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import {Label} from "@/components/ui/label";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { deleteObject, ref } from 'firebase/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getStatus = (product: Product): { text: string; className: string } => {
    if (product.currentStock === 0) return { text: 'Zerado', className: 'bg-gray-500/20 text-gray-500 border-gray-500/30' };
    const daysToExpiry = differenceInDays(parseISO(product.expiryDate), new Date());
    if (daysToExpiry < 0) return { text: 'Vencido', className: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (product.currentStock <= product.minimumStock) return { text: 'Estoque Baixo', className: 'bg-orange-500/20 text-orange-500 border-orange-500/30' };
    if (daysToExpiry <= 30) return { text: 'Vencendo', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' };
    return { text: 'Estoque OK', className: 'bg-green-500/20 text-green-500 border-green-500/30' };
};

const entryReasons: StockMovementReason[] = ['Compra', 'Ajuste', 'Entrada Manual'];
const exitReasons: StockMovementReason[] = ['Uso', 'Venda', 'Perda', 'Ajuste', 'Saída Manual'];


function MovementForm({ product, type, onFinished }: { product: Product, type: 'entrada' | 'saida', onFinished: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            const formData = new FormData(event.currentTarget);
            const quantity = parseInt(formData.get('quantity') as string, 10);
            const reason = formData.get('reason') as StockMovementReason;
            const professionalName = formData.get('professionalName') as string;
            const notes = formData.get('notes') as string;
            
            if (isNaN(quantity) || quantity <= 0) {
                toast({ variant: 'destructive', title: 'Erro', description: 'A quantidade deve ser um número positivo.' });
                setIsSaving(false);
                return;
            }

            if (type === 'saida' && quantity > product.currentStock) {
                toast({ variant: 'destructive', title: 'Erro', description: 'A quantidade de saída não pode ser maior que o estoque atual.' });
                setIsSaving(false);
                return;
            }

            const batch = writeBatch(db);
            const productDocRef = doc(db, `users/${user.uid}/products`, product.id);
            
            const previousStock = product.currentStock;
            const newStock = type === 'entrada' ? previousStock + quantity : previousStock - quantity;

            const productUpdateData: Partial<Product> = { currentStock: newStock };
            
            const baseMovementData: Omit<StockMovement, 'id' | 'newExpiryDate' | 'newBatchNumber' | 'newCostPrice'> = {
                productId: product.id,
                productName: product.name,
                type,
                quantity,
                reason,
                date: new Date().toISOString(),
                previousStock,
                newStock,
                notes,
                professionalName,
            };

            let movementData: StockMovement | Omit<StockMovement, 'id'> = baseMovementData;

            if (type === 'entrada') {
                const newExpiryDate = formData.get('newExpiryDate') as string;
                const newBatchNumber = formData.get('newBatchNumber') as string;
                const newCostPrice = parseFloat((formData.get('newCostPrice') as string || '0').replace(',', '.'));
                 
                if (!newExpiryDate) {
                    toast({ variant: 'destructive', title: 'Erro', description: 'A data de validade é obrigatória para entradas.' });
                    setIsSaving(false);
                    return;
                }
                
                productUpdateData.expiryDate = newExpiryDate;
                
                const entrySpecificData = {
                    ...baseMovementData,
                    newExpiryDate,
                    newBatchNumber: newBatchNumber || product.batchNumber,
                    newCostPrice: (newCostPrice && !isNaN(newCostPrice) && newCostPrice > 0) ? newCostPrice : product.costPrice
                };

                if(newBatchNumber) {
                    productUpdateData.batchNumber = newBatchNumber;
                }
                if(newCostPrice && !isNaN(newCostPrice) && newCostPrice > 0) {
                    productUpdateData.costPrice = newCostPrice;
                }
                 movementData = entrySpecificData;
            }
            
            batch.update(productDocRef, productUpdateData);
            
            const movementCollectionRef = collection(db, `users/${user.uid}/movements`);
            const newMovementRef = doc(movementCollectionRef);
            
            batch.set(newMovementRef, movementData);
            
            await batch.commit();

            toast({
                title: 'Sucesso!',
                description: `Movimentação de ${type} registrada.`,
                className: 'bg-green-500 text-white',
            });
            onFinished();

        } catch (error) {
            console.error("Erro ao registrar movimentação: ", error);
            toast({ variant: 'destructive', title: 'Erro na Transação', description: `Não foi possível registrar a movimentação. ${error instanceof Error ? error.message : ''}` });
        } finally {
            setIsSaving(false);
        }
    };

    const reasons = type === 'entrada' ? entryReasons : exitReasons;
    const defaultReason = type === 'entrada' ? 'Compra' : 'Uso';

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 max-h-[80vh] overflow-y-auto">
             <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade*</Label>
                <Input id="quantity" name="quantity" type="number" placeholder="0" required min="1"/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="reason">Motivo*</Label>
                 <Select name="reason" defaultValue={defaultReason} required>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                        {reasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="professionalName">Profissional Responsável</Label>
                <Input id="professionalName" name="professionalName" placeholder="Nome do profissional" />
            </div>

            {type === 'entrada' && (
                <div className='space-y-4 rounded-md border p-4 bg-muted/50'>
                    <p className="text-sm font-medium">Informações da Nova Entrada (Opcional)</p>
                    <p className="text-xs text-muted-foreground -mt-3">Preencha para atualizar os dados do produto com os do novo lote.</p>
                     <div className="space-y-2">
                        <Label htmlFor="newExpiryDate">Nova Data de Validade*</Label>
                        <Input id="newExpiryDate" name="newExpiryDate" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="newBatchNumber">Novo Lote</Label>
                        <Input id="newBatchNumber" name="newBatchNumber" placeholder="Lote do novo produto" defaultValue={product.batchNumber}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="newCostPrice">Novo Preço de Custo (R$)</Label>
                        <Input id="newCostPrice" name="newCostPrice" type="number" step="0.01" placeholder="0,00" defaultValue={product.costPrice} />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="notes">Observações (Opcional)</Label>
                <Textarea id="notes" name="notes" placeholder="Ex: Compra de emergência, ajuste de inventário" />
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Movimentação
            </Button>
        </form>
    )
}

function ProductDetailsDialog({ product }: { product: Product }) {
    const detailItem = (label: string, value?: string | number | null) => {
        if (!value && value !== 0) return null;
        return (
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
            </div>
        )
    }

    return (
        <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Detalhes do Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                        {product.photoURL && <Image src={product.photoURL} alt={product.name} fill className="object-cover" data-ai-hint={product['data-ai-hint']} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{product.name}</h3>
                        <p className="text-muted-foreground">{product.category}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {detailItem("Estoque Atual", product.currentStock)}
                    {detailItem("Estoque Mínimo", product.minimumStock)}
                    {detailItem("Unidade", product.unit)}
                    {detailItem("Data de Validade", new Date(product.expiryDate).toLocaleDateString('pt-BR'))}
                    {detailItem("Lote", product.batchNumber)}
                    {detailItem("Fornecedor", product.supplier)}
                    {detailItem("Preço de Custo", product.costPrice > 0 ? `R$ ${product.costPrice.toFixed(2)}` : undefined)}
                    {detailItem("Cód. Barras", product.barcode)}
                </div>

                {product.notes && (
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Observações</p>
                        <p className="text-sm rounded-md border bg-muted/50 p-3">{product.notes}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}

function ProductCard({ product, onDelete }: { product: Product, onDelete: (product: Product) => Promise<void> }) {
  const status = getStatus(product);
  const daysToExpiry = differenceInDays(parseISO(product.expiryDate), new Date());
  const [isDeleting, setIsDeleting] = useState(false);
  const [sheetType, setSheetType] = useState<'entrada' | 'saida' | null>(null);
  
  let expiryColor = 'text-green-500';
  if (product.currentStock > 0) {
    if (daysToExpiry < 0) expiryColor = 'text-red-500';
    else if (daysToExpiry <= 30) expiryColor = 'text-orange-500';
  } else {
    expiryColor = 'text-muted-foreground';
  }


  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(product);
  };

  return (
    <Card>
      <CardContent className="p-3 flex items-start gap-3">
        <Dialog>
            <DialogTrigger asChild>
                <div className="flex flex-1 items-start gap-3 cursor-pointer min-w-0">
                    <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                        {product.photoURL && <Image src={product.photoURL} alt={product.name} fill className="object-cover" data-ai-hint={product['data-ai-hint']} />}
                    </div>
                    
                    <div className="flex-1 space-y-1 min-w-0">
                        <div className='flex justify-between items-start gap-2'>
                            <h3 className="font-semibold leading-tight flex-1 truncate">{product.name}</h3>
                            <Badge variant="outline" className={cn("text-xs whitespace-nowrap flex-shrink-0", status.className)}>{status.text}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{product.category}</p>
                    
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground pt-2">
                            <span>Estoque: <span className="font-medium text-foreground">{product.currentStock} / min: {product.minimumStock}</span></span>
                            <span className={expiryColor}>
                            Val: {new Date(product.expiryDate).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    </div>
                </div>
            </DialogTrigger>
            <ProductDetailsDialog product={product} />
        </Dialog>
        
        <Sheet open={!!sheetType} onOpenChange={(isOpen) => !isOpen && setSheetType(null)}>
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className='-mr-2 -mt-1 h-8 w-8 flex-shrink-0'>
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/products/${product.id}/edit`}><Edit className="mr-2 h-4 w-4"/>Editar</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSheetType('entrada')}>
                <ArrowUp className="mr-2 h-4 w-4 text-green-500"/>Registrar Entrada
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSheetType('saida')}>
                <ArrowDown className="mr-2 h-4 w-4 text-red-500"/>Registrar Saída
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                  <Trash2 className="mr-2 h-4 w-4"/>Excluir
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o produto <span className="font-semibold">{product.name}</span> e todo o seu histórico de movimentações.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sim, excluir
              </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>
          <SheetContent className="flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
              <SheetHeader>
                  <SheetTitle>
                  {sheetType === 'entrada' ? `Registrar Entrada: ${product.name}` : `Registrar Saída: ${product.name}`}
                  </SheetTitle>
                  <SheetDescription>
                      {sheetType === 'entrada' 
                          ? 'Adicione novas unidades ao estoque deste produto.' 
                          : 'Remova unidades do estoque (por uso, venda, perda, etc).'}
                  </SheetDescription>
              </SheetHeader>
              <div className='overflow-y-auto -mr-6 pr-6'>
                  {sheetType && <MovementForm product={product} type={sheetType} onFinished={() => setSheetType(null)} />}
              </div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  )
}


export default function ProductsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('Todos');

    const filters = ['Todos', 'Vencendo', 'Estoque Baixo', 'Injetáveis', 'Descartáveis'];

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const productsCollectionRef = collection(db, `users/${user.uid}/products`);
        const q = query(productsCollectionRef);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const productsData: Product[] = [];
            querySnapshot.forEach((doc) => {
                productsData.push({ ...doc.data() as Omit<Product, 'id'>, id: doc.id });
            });
            setProducts(productsData.sort((a,b) => a.name.localeCompare(b.name)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching products: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);
    
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!searchMatch) return false;
            
            if (activeFilter === 'Todos') return true;
            if (activeFilter === 'Vencendo') {
                if (product.currentStock === 0) return false;
                const daysToExpiry = differenceInDays(parseISO(product.expiryDate), new Date());
                return daysToExpiry >= 0 && daysToExpiry <= 30;
            }
            if (activeFilter === 'Estoque Baixo') {
                return product.currentStock > 0 && product.currentStock <= product.minimumStock;
            }
            if (activeFilter === 'Injetáveis') {
                return product.category === 'Injetáveis';
            }
            if (activeFilter === 'Descartáveis') {
                return product.category === 'Materiais Descartáveis';
            }
            return true;
        });
    }, [products, searchTerm, activeFilter]);

    const handleExportCSV = async () => {
        const { unparse } = await import('papaparse');
        const dataToExport = filteredProducts.map(p => ({
            "Name": p.name,
            "Category": p.category,
            "Current Stock": p.currentStock,
            "Minimum Stock": p.minimumStock,
            "Unit": p.unit,
            "Expiry Date": new Date(p.expiryDate).toLocaleDateString('pt-BR'),
            "Batch Number": p.batchNumber,
            "Supplier": p.supplier,
            "Cost Price": p.costPrice.toFixed(2),
            "Barcode": p.barcode || '',
            "Notes": p.notes || '',
        }));

        const csv = unparse(dataToExport);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) {
            URL.revokeObjectURL(link.href);
        }
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `stock_products_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteProduct = async (product: Product) => {
        if (!user) {
            toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado." });
            return;
        }
        try {
            // Também excluir a imagem do storage
            if (product.photoURL) {
                const imageRef = ref(storage, product.photoURL);
                await deleteObject(imageRef).catch(err => console.warn("Imagem não encontrada no storage, talvez já tenha sido deletada", err));
            }

            const productDocRef = doc(db, `users/${user.uid}/products`, product.id);
            await deleteDoc(productDocRef);
            
            toast({
                title: "Sucesso!",
                description: "Produto excluído permanentemente.",
                className: "bg-green-500 text-white"
            });
        } catch (error) {
            console.error("Error deleting product: ", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o produto." });
        }
    };

    const renderContent = () => {
      if (loading) {
          return (
              <div className="space-y-3 pt-4">
                  {[...Array(3)].map((_, i) => (
                      <Card key={i}>
                          <CardContent className="p-3 flex items-start gap-4">
                             <Skeleton className="h-[64px] w-[64px] rounded-md" />
                              <div className="flex-1 space-y-2 pt-1">
                                  <Skeleton className="h-4 w-3/4" />
                                  <Skeleton className="h-4 w-1/2" />
                                  <div className="flex justify-between pt-2">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-4 w-1/4" />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  ))}
              </div>
          )
      }
  
      if (products.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card p-12 text-center mt-4">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhum produto cadastrado</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Comece a adicionar produtos para vê-los aqui.</p>
                  <Button asChild className="mt-4">
                      <Link href="/products/new">Adicionar Primeiro Produto</Link>
                  </Button>
              </div>
          )
      }

      if (filteredProducts.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card p-12 text-center mt-4">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum resultado encontrado</h3>
                <p className="mt-1 text-sm text-muted-foreground">Tente ajustar sua busca ou filtros.</p>
            </div>
        )
    }
  
      return (
          <div className="space-y-3 pt-4">
              {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onDelete={handleDeleteProduct} />
              ))}
          </div>
      );
    }

  return (
    <div className="space-y-4">
       <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Meus Produtos</h2>
                <p className="text-muted-foreground">Gerencie todos os seus itens em um só lugar.</p>
            </div>
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredProducts.length === 0} className="flex-shrink-0">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar
            </Button>
        </div>
      <div className="sticky top-16 bg-secondary/95 backdrop-blur-sm z-10 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Buscar produtos..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
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
      
      {renderContent()}
      
    </div>
  );
}
