import { mockProducts } from '@/lib/mock-data';
import type { Product } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Edit, PackagePlus, Trash2, XCircle } from 'lucide-react';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type AlertType = 'expired' | 'expiring_7' | 'expiring_30' | 'low_stock';

const getAlerts = () => {
    const alerts: Record<AlertType, Product[]> = {
        expired: [],
        expiring_7: [],
        expiring_30: [],
        low_stock: [],
    };

    mockProducts.forEach(p => {
        const daysToExpiry = differenceInDays(parseISO(p.expiryDate), new Date());
        if (daysToExpiry < 0) {
            alerts.expired.push(p);
        } else if (daysToExpiry <= 7) {
            alerts.expiring_7.push(p);
        } else if (daysToExpiry <= 30) {
            alerts.expiring_30.push(p);
        }

        if (p.currentStock <= p.minimumStock && p.currentStock > 0) {
            alerts.low_stock.push(p);
        }
    });

    return alerts;
};

const alertConfig = {
    expired: { title: 'Produtos Vencidos', icon: XCircle, color: 'text-red-500' },
    expiring_7: { title: 'Vencendo em 7 dias', icon: AlertTriangle, color: 'text-red-500' },
    expiring_30: { title: 'Vencendo em 30 dias', icon: AlertTriangle, color: 'text-orange-500' },
    low_stock: { title: 'Estoque Baixo', icon: AlertTriangle, color: 'text-orange-500' },
}

function AlertCard({ product }: { product: Product }) {
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
                <div className="mt-2 flex justify-end gap-2">
                    <Button variant="outline" size="sm"><Edit className="mr-1 h-3 w-3"/> Editar</Button>
                    <Button variant="outline" size="sm"><PackagePlus className="mr-1 h-3 w-3"/> Entrada</Button>
                    <Button variant="destructive" size="sm"><Trash2 className="mr-1 h-3 w-3"/> Descartar</Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AlertsPage() {
    const alerts = getAlerts();
    const alertOrder: AlertType[] = ['expired', 'expiring_7', 'expiring_30', 'low_stock'];

  return (
    <div className="space-y-4">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Alertas do Estoque</h2>
            <p className="text-muted-foreground">Ações necessárias para manter seu estoque saudável.</p>
        </div>

        <Accordion type="multiple" defaultValue={['expired', 'expiring_7']} className="w-full space-y-4">
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
    </div>
  );
}
