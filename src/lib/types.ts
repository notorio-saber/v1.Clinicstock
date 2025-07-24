export type Product = {
  id: string;
  name: string;
  category: 'Injetáveis' | 'Cosméticos Profissionais' | 'Materiais Descartáveis' | 'Equipamentos' | 'Outros';
  photoURL: string;
  'data-ai-hint'?: string;
  currentStock: number;
  minimumStock: number;
  unit: 'Un' | 'Caixa' | 'Frasco' | 'ml' | 'Ampola';
  expiryDate: string;
  batchNumber?: string;
  supplier?: string;
  costPrice?: number;
  notes?: string;
};

export type StockMovement = {
  id: string;
  productName: string;
  productId: string;
  type: 'entrada' | 'saida';
  quantity: number;
  reason?: 'Uso' | 'Venda' | 'Perda' | 'Vencimento' | 'Compra';
  date: string;
  previousStock: number;
  newStock: number;
};
