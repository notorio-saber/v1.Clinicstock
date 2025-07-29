'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import useAuth from '@/hooks/useAuth';

const plans = [
    {
        name: 'Plano Mensal',
        price: 'R$ 39,90',
        period: '/mês',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '',
        features: [
            'Gerenciamento de Produtos',
            'Controle de Estoque e Validade',
            'Histórico de Movimentações',
            'Alertas de Estoque Baixo',
            'Exportação de Dados',
        ]
    },
    {
        name: 'Plano Anual',
        price: 'R$ 399',
        period: '/ano',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || '',
        features: [
           'Todos os benefícios do plano mensal',
           '2 meses de desconto',
           'Suporte prioritário',
           'Acesso a novas funcionalidades'
        ],
        isFeatured: true
    }
]

export default function SubscriptionModal() {
  const { user, subscription } = useAuth();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const handleCreateCheckout = async (priceId: string) => {
    // A ser implementado no próximo passo
  };

  const handleManageSubscription = async () => {
    // A ser implementado no próximo passo
  };

  const renderContent = () => {
    if (subscription?.isActive) {
        return (
             <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Você já é um assinante!</CardTitle>
                    <CardDescription>
                        Obrigado por fazer parte do ClinicStock. Sua assinatura está ativa.
                        Acesse a sua conta no Stripe para gerenciar seus dados de pagamento.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button 
                        className="w-full" 
                        onClick={handleManageSubscription}
                        disabled={loadingPriceId === 'manage'}
                    >
                         {loadingPriceId === 'manage' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Gerenciar Assinatura
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {plans.map(plan => (
                 <Card key={plan.name} className={plan.isFeatured ? 'border-primary' : ''}>
                    <CardHeader>
                        <CardTitle>{plan.name}</CardTitle>
                         <div className="flex items-baseline">
                            <span className="text-4xl font-bold">{plan.price}</span>
                            <span className="text-muted-foreground">{plan.period}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-2">
                        {plan.features.map(feature => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500"/>
                                <span>{feature}</span>
                            </li>
                        ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                         <Button 
                            className="w-full" 
                            onClick={() => handleCreateCheckout(plan.priceId)}
                            disabled={!plan.priceId || !!loadingPriceId}
                        >
                            {loadingPriceId === plan.priceId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {plan.isFeatured ? 'Assinar com Desconto' : 'Assinar Agora'}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Escolha o plano ideal para você</h1>
            <p className="text-muted-foreground mt-2">Desbloqueie todo o potencial do ClinicStock.</p>
        </div>
        {renderContent()}
    </div>
  );
}
