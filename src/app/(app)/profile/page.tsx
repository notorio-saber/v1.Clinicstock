'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Shield, LogOut, Loader2, Upload, CreditCard } from 'lucide-react';
import useAuth from '@/hooks/useAuth';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { auth, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user, subscription, loading: authLoading, reloadUser, logout } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagingSub, setIsManagingSub] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPasswordProvider = user?.providerData.some(p => p.providerId === 'password');

  useEffect(() => {
    // This effect ensures we get the latest subscription status when the page loads,
    // especially after being redirected from Stripe checkout.
    if (user) {
        reloadUser();
    }
  }, [reloadUser, user]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setImagePreview(user.photoURL);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: 'Você saiu da sua conta.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao sair', description: 'Não foi possível fazer logout. Tente novamente.' });
    }
  };
  
  const handleManageSubscription = async () => {
    if (!user) return;
    setIsManagingSub(true);
    try {
        const response = await fetch('/api/manage-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create portal link.');
        }

        const { url } = await response.json();
        if (url) {
            window.location.href = url;
        } else {
             toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível obter o link para gerenciar sua assinatura.' });
        }
    } catch (error) {
        console.error("Error creating portal link:", error);
        const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
        toast({ variant: 'destructive', title: 'Erro ao Gerenciar Assinatura', description: errorMessage });
    } finally {
        setIsManagingSub(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
      if (!user) return;
      
      const hasDisplayNameChanged = displayName !== (user.displayName || '');
      const hasNewImage = !!imageFile;

      if (!hasDisplayNameChanged && !hasNewImage) {
          toast({ title: 'Nenhuma alteração', description: 'Não há novas informações para salvar.' });
          return;
      }

      setIsSaving(true);
      try {
          let photoURL = user.photoURL;

          if (hasNewImage && imageFile) {
              const imageRef = ref(storage, `users/${user.uid}/profile-picture`);
              await uploadBytes(imageRef, imageFile);
              photoURL = await getDownloadURL(imageRef);
          }

          if (auth.currentUser) {
            await updateProfile(auth.currentUser, {
                displayName: displayName,
                photoURL: photoURL,
            });
          }

          await reloadUser();
          
          toast({ title: 'Sucesso!', description: 'Perfil atualizado.', className: 'bg-green-500 text-white' });
          setImageFile(null);
          
      } catch (error) {
          console.error("Error updating profile: ", error);
          toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o perfil.' });
      } finally {
          setIsSaving(false);
      }
  }

  const handlePasswordReset = async () => {
    if (!user || !user.email) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Usuário ou e-mail não encontrado.' });
        return;
    }
    try {
        await sendPasswordResetEmail(auth, user.email);
        toast({
            title: 'E-mail enviado!',
            description: `Um link para redefinir sua senha foi enviado para ${user.email}.`,
        });
    } catch (error) {
        console.error("Error sending password reset email:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar o e-mail de redefinição de senha.' });
    }
  };


  if (authLoading || !user) {
      return (
           <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                 <Skeleton className="h-24 w-24 rounded-full" />
                 <div className="text-center space-y-2">
                     <Skeleton className="h-6 w-48" />
                     <Skeleton className="h-4 w-56" />
                 </div>
              </div>
               <Card>
                 <CardHeader>
                   <CardTitle>Informações da Conta</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4 pt-6">
                   <div className="space-y-2">
                     <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-10 w-full" />
                   </div>
                   <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-10 w-full" />
                   </div>
                   <Skeleton className="h-11 w-full rounded-md" />
                 </CardContent>
               </Card>
           </div>
      )
  }

  return (
    <div className="space-y-6">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
        />
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={imagePreview || undefined} alt={user?.displayName || 'User'} />
            <AvatarFallback>{displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Button size="icon" className="absolute bottom-0 right-0 h-8 w-8 rounded-full" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold">{displayName || 'Usuário'}</h2>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome da Clínica ou Profissional</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome ou da clínica" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email || ''} disabled />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>
      
       <Card>
          <CardHeader>
            <CardTitle>Assinatura</CardTitle>
            <CardDescription>
                {subscription?.isActive 
                    ? `Seu plano está ativo. ` 
                    : 'Você não tem uma assinatura ativa. Escolha um plano para continuar.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription?.isActive ? (
                 <Button variant="outline" className="w-full" onClick={handleManageSubscription} disabled={isManagingSub}>
                    {isManagingSub ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4"/>}
                    Gerenciar Assinatura
                </Button>
            ) : (
                 <Button variant="default" className="w-full" onClick={() => router.push('/subscription')}>
                    <CreditCard className="mr-2 h-4 w-4"/>
                    Ver Planos
                </Button>
            )}
          </CardContent>
        </Card>

      <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPasswordProvider && (
              <Button variant="ghost" className="w-full justify-start p-4 -ml-4" onClick={handlePasswordReset}>
                  <Shield className="mr-3 h-5 w-5" />
                  Segurança e Senha
              </Button>
            )}
          </CardContent>
        </Card>

       <Card>
         <CardContent className="p-3">
             <Button variant="destructive" className="w-full justify-center text-base py-6" onClick={handleLogout}>
                <LogOut className="mr-3 h-5 w-5"/>
                Sair da Conta
            </Button>
         </CardContent>
      </Card>
    </div>
  );
}
