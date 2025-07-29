'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, LogOut } from 'lucide-react';
import { useState } from 'react';
import useAuth from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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

export default function SubscriptionPage() {
  const { user, subscription, loading, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const handleCreateCheckout = async (priceId: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para assinar.' });
        return;
    }
    setLoadingPriceId(priceId);
    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId: priceId, userId: user.uid }),
        });

        const { url } = await response.json();
        if (url) {
            window.location.href = url;
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível iniciar o checkout. Tente novamente.' });
        }

    } catch (error) {
        console.error("Error creating checkout session:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro inesperado.' });
    } finally {
        setLoadingPriceId(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPriceId('manage');
    try {
        const response = await fetch('/api/manage-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user?.uid }),
        });
        const { url } = await response.json();
        if (url) {
            window.location.href = url;
        } else {
             toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível gerenciar sua assinatura. Tente novamente.' });
        }
    } catch (error) {
         console.error("Error creating portal link:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro inesperado.' });
    } finally {
        setLoadingPriceId(null);
    }
  };

  if (loading) {
     return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-secondary">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  // This logic is important to redirect user if they land here by mistake
  if (subscription?.isActive) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-secondary">
             <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Sua assinatura já está ativa!</CardTitle>
                    <CardDescription>
                        Você será redirecionado para o painel principal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button 
                        className="w-full" 
                        onClick={() => router.push('/dashboard')}
                    >
                        Ir para o Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <>
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Escolha o plano ideal para você</h1>
            <p className="text-muted-foreground mt-2">Desbloqueie todo o potencial do ClinicStock.</p>
        </div>
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
                            disabled={!plan.priceId || !!loadingPriceId || !user}
                        >
                            {loadingPriceId === plan.priceId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {plan.isFeatured ? 'Assinar com Desconto' : 'Assinar Agora'}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
        <div className="mt-8">
            <Button variant="ghost" onClick={logout} className="text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4"/>
                Sair
            </Button>
        </div>
    </>
  );
}
