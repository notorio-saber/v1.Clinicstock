import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload } from 'lucide-react';

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Adicionar Novo Produto</h2>
        <p className="text-muted-foreground">Preencha os detalhes para cadastrar um novo item no estoque.</p>
      </div>
      
      <Button variant="outline" className="w-full h-16 text-lg" >
        <Camera className="mr-3 h-8 w-8" />
        ESCANEAR CÓDIGO
      </Button>
      
      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input id="barcode" placeholder="7891234567890" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto</Label>
              <Input id="name" placeholder="Ex: Botox 100u" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="injetaveis">Injetáveis</SelectItem>
                  <SelectItem value="cosmeticos">Cosméticos Profissionais</SelectItem>
                  <SelectItem value="descartaveis">Materiais Descartáveis</SelectItem>
                  <SelectItem value="equipamentos">Equipamentos</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Foto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="mx-auto h-32 w-32 bg-secondary rounded-lg flex items-center justify-center">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="flex gap-4 justify-center">
                <Button variant="outline"><Camera className="mr-2 h-4 w-4"/> Tirar Foto</Button>
                <Button variant="outline"><Upload className="mr-2 h-4 w-4"/> Galeria</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estoque</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade Atual</Label>
              <Input id="quantity" type="number" placeholder="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-quantity">Quantidade Mínima</Label>
              <Input id="min-quantity" type="number" placeholder="10" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">Un</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="frasco">Frasco</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="ampola">Ampola</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validade e Lote</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry-date">Data de Validade</Label>
              <Input id="expiry-date" type="date" required />
            </div>
             <div className="space-y-2">
              <Label htmlFor="batch">Número do Lote</Label>
              <Input id="batch" placeholder="ABC1234" />
            </div>
            <div className="col-span-2 space-y-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input id="supplier" placeholder="Nome do fornecedor" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financeiro e Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Preço de Custo (R$)</Label>
              <Input id="cost" type="number" step="0.01" placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" placeholder="Detalhes sobre armazenamento, uso, etc." />
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="sticky bottom-24 -mx-4 -mb-24 bg-background/80 p-4 backdrop-blur-sm">
         <Button size="lg" className="w-full">Salvar Produto</Button>
      </div>
    </div>
  );
}
