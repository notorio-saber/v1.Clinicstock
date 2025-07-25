'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Camera, Upload, Loader2, PackagePlus } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import useAuth from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Product, StockMovement } from '@/lib/types';

const productSchema = z.object({
  name: z.string().min(3, { message: 'O nome do produto é obrigatório.' }),
  category: z.string({ required_error: 'Selecione uma categoria.' }),
  barcode: z.string().optional(),
  currentStock: z.coerce.number().min(0, 'O estoque não pode ser negativo.'),
  minimumStock: z.coerce.number().min(0, 'O estoque mínimo não pode ser negativo.').default(0),
  unit: z.string({ required_error: 'Selecione uma unidade.' }),
  expiryDate: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Data de validade inválida ou não preenchida." }),
  batchNumber: z.string().optional().default(''),
  supplier: z.string().optional().default(''),
  costPrice: z.coerce.number().min(0, 'O preço de custo não pode ser negativo.').optional().default(0),
  notes: z.string().optional().default(''),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      barcode: '',
      currentStock: 0,
      minimumStock: 10,
      notes: '',
      batchNumber: '',
      supplier: '',
      costPrice: 0,
    },
  });

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const onSubmit = async (data: ProductFormValues) => {
    setIsSaving(true);
    
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro de Autenticação', description: 'Usuário não encontrado. Faça login novamente.' });
      setIsSaving(false);
      return;
    }
    
    if (!imageFile) {
      toast({ variant: 'destructive', title: 'Foto ausente', description: 'Por favor, adicione uma foto para o produto.' });
      setIsSaving(false);
      return;
    }

    try {
      // Step 1: Upload Image
      const newProductDocRef = doc(collection(db, `users/${user.uid}/products`));
      const productId = newProductDocRef.id;
      const imageRef = ref(storage, `users/${user.uid}/products/${productId}/${imageFile.name}`);
      
      const uploadResult = await uploadBytes(imageRef, imageFile);
      const photoURL = await getDownloadURL(uploadResult.ref);
      
      // Step 2: Prepare data and write to Firestore using a batch
      const productData: Omit<Product, 'id'> = {
        name: data.name,
        category: data.category as any,
        photoURL,
        'data-ai-hint': 'product bottle',
        currentStock: data.currentStock,
        minimumStock: data.minimumStock,
        unit: data.unit as any,
        expiryDate: data.expiryDate,
        batchNumber: data.batchNumber || '',
        supplier: data.supplier || '',
        costPrice: data.costPrice || 0,
        notes: data.notes || '',
        barcode: data.barcode || '',
      };
      
      const batch = writeBatch(db);
      
      batch.set(newProductDocRef, productData);

      if (data.currentStock > 0) {
          const movementRef = doc(collection(db, `users/${user.uid}/movements`));
          const movementData: Omit<StockMovement, 'id'> = {
              productId: productId,
              productName: data.name,
              type: 'entrada',
              quantity: data.currentStock,
              reason: 'Entrada Manual',
              date: new Date().toISOString(),
              previousStock: 0,
              newStock: data.currentStock,
              notes: 'Estoque inicial ao cadastrar o produto.',
              professionalName: user.displayName || 'Sistema',
              newBatchNumber: data.batchNumber,
              newExpiryDate: data.expiryDate,
              newCostPrice: data.costPrice,
          };
          batch.set(movementRef, movementData);
      }
      
      await batch.commit();

      toast({
        title: 'Sucesso!',
        description: 'Produto cadastrado com sucesso.',
        className: 'bg-green-500 text-white',
      });
      router.push('/products');

    } catch (error: any) {
        console.error("Erro detalhado ao salvar produto: ", error);
        toast({ 
            variant: 'destructive', 
            title: 'Erro Crítico ao Salvar', 
            description: `Ocorreu um erro: ${error.message}. Verifique o console para mais detalhes.`,
            duration: 9000
        });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Adicionar Novo Produto</h2>
        <p className="text-muted-foreground">Preencha os detalhes para cadastrar um novo item no estoque.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-24">
          <Card>
            <CardHeader>
              <CardTitle>Foto do Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              <div className="mx-auto h-32 w-32 bg-secondary rounded-lg flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                   <Image src={imagePreview} alt="Preview do produto" width={128} height={128} className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-4 justify-center">
                <Button type="button" variant="outline" onClick={triggerFileSelect}>
                  <Upload className="mr-2 h-4 w-4" /> Escolher da Galeria
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto*</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Botox 100u" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Injetáveis">Injetáveis</SelectItem>
                        <SelectItem value="Cosméticos Profissionais">Cosméticos Profissionais</SelectItem>
                        <SelectItem value="Materiais Descartáveis">Materiais Descartáveis</SelectItem>
                        <SelectItem value="Equipamentos">Equipamentos</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="7891234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estoque</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Inicial*</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                  control={form.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Mínima</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade de Medida*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                       </FormControl>
                        <SelectContent>
                          <SelectItem value="Un">Unidade (Un)</SelectItem>
                          <SelectItem value="Caixa">Caixa</SelectItem>
                          <SelectItem value="Frasco">Frasco</SelectItem>
                          <SelectItem value="ml">Mililitro (ml)</SelectItem>
                          <SelectItem value="Ampola">Ampola</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validade e Lote</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Validade*</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Lote</FormLabel>
                    <FormControl><Input placeholder="ABC1234" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <FormControl><Input placeholder="Nome do fornecedor" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Custo (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea placeholder="Detalhes sobre armazenamento, uso, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

           <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 pb-[72px] md:max-w-3xl md:mx-auto md:left-auto">
             <div className="container mx-auto max-w-3xl p-4">
                <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando...</>
                  ) : (
                    <><PackagePlus className="mr-2 h-5 w-5" /> Salvar Produto</>
                  )}
                </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
