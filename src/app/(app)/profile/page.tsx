'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Edit2, Shield, Bell, LogOut } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src="https://placehold.co/96x96.png" alt="User" data-ai-hint="profile person" />
            <AvatarFallback>CE</AvatarFallback>
          </Avatar>
          <Button size="icon" className="absolute bottom-0 right-0 rounded-full">
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold">Clínica Estética</h2>
          <p className="text-muted-foreground">clinica.estetica@email.com</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinicName">Nome da Clínica</Label>
            <Input id="clinicName" defaultValue="Clínica Estética" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="clinica.estetica@email.com" />
          </div>
          <Button className="w-full">Salvar Alterações</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
           <Button variant="ghost" className="w-full justify-start">
             <Shield className="mr-3" />
             Segurança e Senha
           </Button>
           <Separator />
           <Button variant="ghost" className="w-full justify-start">
             <Bell className="mr-3" />
             Notificações
           </Button>
        </CardContent>
      </Card>
       <Card>
         <CardContent className="p-3">
             <Button variant="destructive" className="w-full justify-center">
                <LogOut className="mr-3"/>
                Sair da Conta
            </Button>
         </CardContent>
      </Card>
    </div>
  );
}
