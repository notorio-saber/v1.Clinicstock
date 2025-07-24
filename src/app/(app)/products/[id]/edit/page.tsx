'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { Camera, Upload, Loader2, Save } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import useAuth from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const productSchema = z.object({
  name: z.string().min(3, { message: 'O nome do produto é obrigatório.' }),
  category: z.string({ required_error: 'Selecione uma categoria.' }),
  barcode: z.string().optional(),
  currentStock: z.coerce.number().min(0, 'O estoque não pode ser negativo.'),
  minimumStock: z.coerce.number().min(0, 'O estoque mínimo não pode ser negativo.').optional(),
  unit: z.string({ required_error: 'Selecione uma unidade.' }),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data de validade inválida." }),
  batchNumber: z.string().optional(),
  supplier: z.string().optional(),
  costPrice: z.coerce.number().min(0, 'O preço de custo não pode ser negativo.').optional(),
  notes: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    if (!user || !productId) return;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const productDocRef = doc(db, `users/${user.uid}/products`, productId);
        const productDoc = await getDoc(productDocRef);
        if (productDoc.exists()) {
          const productData = productDoc.data() as Product;
          setProduct(productData);
          form.reset(productData);
          setImagePreview(productData.photoURL);
        } else {
           toast({ variant: 'destructive', title: 'Erro', description: 'Produto não encontrado.' });
           router.push('/products');
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar o produto.' });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [user, productId, router, toast, form]);

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
    if (!user || !product) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para salvar.' });
      return;
    }
    
    setIsSaving(true);
    try {
      let photoURL = product.photoURL;

      if (imageFile) {
        const imageRef = ref(storage, `users/${user.uid}/products/${productId}/${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        photoURL = await getDownloadURL(uploadResult.ref);
      }

      const productDocRef = doc(db, `users/${user.uid}/products`, productId);
      await updateDoc(productDocRef, { ...data, photoURL });

      toast({
        title: 'Sucesso!',
        description: 'Produto atualizado com sucesso.',
        className: 'bg-green-500 text-white',
      });
      router.push('/products');

    } catch (error) {
      console.error("Erro ao atualizar produto: ", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível atualizar o produto.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-6 pt-4">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-56 w-full rounded-lg" />
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Editar Produto</h2>
        <p className="text-muted-foreground">Atualize os detalhes do item no estoque.</p>
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
                  <Upload className="mr-2 h-4 w-4" /> Alterar Foto
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
                      <FormLabel>Quantidade Atual*</FormLabel>
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
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando Alterações...</>
                  ) : (
                    <><Save className="mr-2 h-5 w-5" /> Salvar Alterações</>
                  )}
                </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
