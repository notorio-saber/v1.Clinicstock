export type Category = 'Injetáveis' | 'Cosméticos Profissionais' | 'Materiais Descartáveis' | 'Equipamentos' | 'Outros';
export type Unit = 'Un' | 'Caixa' | 'Frasco' | 'ml' | 'Ampola';

export type Product = {
  id: string;
  name: string;
  category: Category;
  photoURL: string;
  'data-ai-hint': string;
  currentStock: number;
  minimumStock: number;
  unit: Unit;
  expiryDate: string; // ISO 8601 format string
  batchNumber: string;
  supplier: string;
  costPrice: number;
  notes: string;
};

export type StockMovementType = 'entrada' | 'saida';
export type StockMovementReason = 'Uso' | 'Venda' | 'Perda' | 'Vencimento' | 'Compra' | 'Ajuste' | 'Entrada Manual' | 'Saída Manual';

export type StockMovement = {
  id: string;
  productName: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason: StockMovementReason;
  date: string; // ISO 8601 format string
  previousStock: number;
  newStock: number;
  notes: string;
};
