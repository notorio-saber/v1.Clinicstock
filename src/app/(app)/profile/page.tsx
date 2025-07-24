'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Edit2, Shield, Bell, LogOut, Loader2, Upload } from 'lucide-react';
import useAuth from '@/hooks/useAuth';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setImagePreview(user.photoURL);
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
      setIsSaving(true);
      try {
          let photoURL = user.photoURL;

          if (imageFile) {
              const imageRef = ref(storage, `users/${user.uid}/profile-picture`);
              await uploadBytes(imageRef, imageFile);
              photoURL = await getDownloadURL(imageRef);
          }

          await updateProfile(user, {
              displayName,
              photoURL,
          });
          
          toast({ title: 'Sucesso!', description: 'Perfil atualizado.', className: 'bg-green-500 text-white' });
      } catch (error) {
          console.error("Error updating profile: ", error);
          toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o perfil.' });
      } finally {
          setIsSaving(false);
      }
  }

  const handleNotImplemented = () => {
    toast({
      title: 'Em breve!',
      description: 'Esta funcionalidade ainda está em desenvolvimento.',
    });
  };

  if (authLoading) {
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
                 <CardContent className="space-y-4">
                   <div className="space-y-2">
                     <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-10 w-full" />
                   </div>
                   <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-10 w-full" />
                   </div>
                   <Skeleton className="h-11 w-full" />
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
            <AvatarImage src={imagePreview || undefined} alt={user?.displayName || 'User'} data-ai-hint="profile person" />
            <AvatarFallback>{displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Button size="icon" className="absolute bottom-0 right-0 rounded-full" onClick={() => fileInputRef.current?.click()}>
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
            <Label htmlFor="clinicName">Nome da Clínica ou Profissional</Label>
            <Input id="clinicName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome ou da clínica" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email || ''} disabled />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Edit2 className="mr-2"/>}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
           <Button variant="ghost" className="w-full justify-start" onClick={handleNotImplemented}>
             <Shield className="mr-3" />
             Segurança e Senha
           </Button>
           <Separator />
           <Button variant="ghost" className="w-full justify-start" onClick={handleNotImplemented}>
             <Bell className="mr-3" />
             Notificações
           </Button>
        </CardContent>
      </Card>
       <Card>
         <CardContent className="p-3">
             <Button variant="destructive" className="w-full justify-center" onClick={handleLogout}>
                <LogOut className="mr-3"/>
                Sair da Conta
            </Button>
         </CardContent>
      </Card>
    </div>
  );
}
