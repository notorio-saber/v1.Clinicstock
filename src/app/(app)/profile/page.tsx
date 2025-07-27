'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Shield, LogOut, Loader2, Upload, Bell, BellOff, Send } from 'lucide-react';
import useAuth from '@/hooks/useAuth';
import { signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { auth, storage, messaging, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { getToken, deleteToken } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

import { sendStockAlerts } from '@/ai/flows/send-alerts-flow';

async function requestNotificationPermission(userId: string) {
    if (!messaging) {
        console.error("Firebase Messaging is not initialized.");
        throw new Error("Messaging not supported.");
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        const vapidKey = "BAlbC8hG3s_44z-J3e-a-UvI4Ua-6zJzIeG2bO9n1gH8f_qG_d3Q3eK9C9s4c3Y6K0b5j3v2n4J8_rR7_z_z_w"; // Use the VAPID key from firebase.ts
        const fcmToken = await getToken(messaging, { vapidKey });
        if (fcmToken) {
            console.log('FCM Token:', fcmToken);
            const tokenRef = doc(db, `users/${userId}/fcmTokens`, fcmToken);
            await setDoc(tokenRef, { token: fcmToken, createdAt: new Date() });
            return true;
        } else {
           console.log('No registration token available. Request permission to generate one.');
           throw new Error("Não foi possível obter o token de notificação.");
        }
    } else {
        console.log('Unable to get permission to notify.');
        throw new Error("Permissão para notificações não foi concedida.");
    }
}

async function revokeNotificationPermission(userId: string) {
    if (!messaging) {
        console.error("Firebase Messaging is not initialized.");
        throw new Error("Messaging not supported.");
    }
    const vapidKey = "BAlbC8hG3s_44z-J3e-a-UvI4Ua-6zJzIeG2bO9n1gH8f_qG_d3Q3eK9C9s4c3Y6K0b5j3v2n4J8_rR7_z_z_w";
    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
        await deleteToken(messaging);
        const tokenRef = doc(db, `users/${userId}/fcmTokens`, currentToken);
        await deleteDoc(tokenRef);
    }
}


export default function ProfilePage() {
  const { user, loading: authLoading, reloadUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPasswordProvider = user?.providerData.some(p => p.providerId === 'password');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setImagePreview(user.photoURL);
      if (typeof window !== 'undefined' && window.Notification) {
        setNotificationStatus(Notification.permission);
      }
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
      toast({ title: 'Você saiu da sua conta.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao sair', description: 'Não foi possível fazer logout. Tente novamente.' });
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

  const handleNotificationToggle = async () => {
    if (!user) return;
    try {
        if (notificationStatus !== 'granted') {
            await requestNotificationPermission(user.uid);
            toast({ title: 'Sucesso!', description: 'Notificações ativadas para este navegador.', className: 'bg-green-500 text-white' });
        } else {
            await revokeNotificationPermission(user.uid);
            toast({ title: 'Sucesso!', description: 'Notificações desativadas para este navegador.' });
        }
        setNotificationStatus(Notification.permission);
    } catch (error: any) {
        setNotificationStatus(Notification.permission);
        toast({ variant: 'destructive', title: 'Erro nas Notificações', description: error.message });
    }
  }

  const handleSendTestNotification = async () => {
      if (!user) return;
      setIsSendingTest(true);
      try {
          const result = await sendStockAlerts({ userId: user.uid });
          if (result.success) {
            if(result.alertsFound > 0 && result.notificationsSent > 0) {
                 toast({ title: 'Notificação de Teste Enviada!', description: `A notificação com ${result.alertsFound} alerta(s) foi enviada.`, className: 'bg-green-500 text-white' });
            } else if (result.alertsFound > 0) {
                 toast({ title: 'Nenhum Dispositivo Encontrado', description: 'Há alertas, mas nenhum dispositivo com notificação ativa foi encontrado.', variant: 'destructive' });
            }
            else {
                 toast({ title: 'Nenhum Alerta', description: 'Seu estoque está em dia! Nenhuma notificação foi enviada.' });
            }
          } else {
              throw new Error(result.message);
          }
      } catch (error: any) {
         toast({ variant: 'destructive', title: 'Erro ao Enviar Teste', description: error.message });
      } finally {
         setIsSendingTest(false);
      }
  }

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
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPasswordProvider && (
              <Button variant="ghost" className="w-full justify-start p-4 -ml-4" onClick={handlePasswordReset}>
                  <Shield className="mr-3 h-5 w-5" />
                  Segurança e Senha
              </Button>
            )}

            <Button variant={notificationStatus === 'granted' ? "secondary" : "default"} className="w-full justify-center" onClick={handleNotificationToggle}>
                {notificationStatus === 'granted' ? <BellOff className="mr-3 h-5 w-5" /> : <Bell className="mr-3 h-5 w-5" />}
                {notificationStatus === 'granted' ? 'Desativar Notificações' : 'Ativar Notificações'}
            </Button>
            <CardDescription className="text-xs text-center pt-2">
                Receba alertas de estoque baixo e produtos vencendo diretamente no seu dispositivo.
            </CardDescription>

            {notificationStatus === 'granted' && (
                 <Button variant="outline" className="w-full" onClick={handleSendTestNotification} disabled={isSendingTest}>
                    {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                    Enviar Notificação de Teste
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
