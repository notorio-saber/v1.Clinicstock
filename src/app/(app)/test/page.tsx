'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import useAuth from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function TestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firestoreStatus, setFirestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [storageStatus, setStorageStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleTestFirestore = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    setFirestoreStatus('loading');
    const testDocRef = doc(db, `users/${user.uid}/test-collection`, 'test-doc');
    
    try {
      // 1. Write
      await setDoc(testDocRef, {
        message: 'Hello Firestore!',
        timestamp: serverTimestamp(),
      });
      toast({ title: 'Firestore Write', description: 'Documento escrito com sucesso.' });

      // 2. Read
      const docSnap = await getDoc(testDocRef);
      if (docSnap.exists() && docSnap.data().message === 'Hello Firestore!') {
        toast({ title: 'Firestore Read', description: 'Documento lido com sucesso.' });
        setFirestoreStatus('success');
      } else {
        throw new Error('Documento de teste não encontrado ou com dados incorretos.');
      }

      // 3. Clean up
      await deleteDoc(testDocRef);

    } catch (error: any) {
      console.error("Firestore test error:", error);
      toast({ variant: 'destructive', title: 'Erro no Teste do Firestore', description: error.message });
      setFirestoreStatus('error');
    }
  };

  const handleTestStorage = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    setStorageStatus('loading');
    const testFileRef = ref(storage, `users/${user.uid}/test-storage/test-file.txt`);
    
    try {
        // 1. Write
        const testString = 'Hello Storage!';
        await uploadString(testFileRef, testString);
        toast({ title: 'Storage Write', description: 'Arquivo enviado com sucesso.' });
        
        // 2. Read (get URL)
        const url = await getDownloadURL(testFileRef);
        if (url) {
            toast({ title: 'Storage Read', description: 'URL do arquivo obtida com sucesso.' });
            setStorageStatus('success');
        } else {
            throw new Error('Não foi possível obter a URL de download.');
        }

        // 3. Clean up
        await deleteObject(testFileRef);

    } catch (error: any) {
        console.error("Storage test error:", error);
        toast({ variant: 'destructive', title: 'Erro no Teste do Storage', description: error.message });
        setStorageStatus('error');
    }
  };

  const renderStatusIcon = (status: 'idle' | 'loading' | 'success' | 'error') => {
    switch (status) {
        case 'loading':
            return <Loader2 className="h-5 w-5 animate-spin" />;
        case 'success':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'error':
            return <XCircle className="h-5 w-5 text-red-500" />;
        default:
            return null;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Página de Diagnóstico do Firebase</CardTitle>
          <CardDescription>
            Use estes botões para verificar se as conexões com os serviços do Firebase (Firestore e Storage) estão funcionando corretamente.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Teste do Firestore (Banco de Dados)</CardTitle>
           <CardDescription>
            Este teste tentará escrever, ler e depois apagar um documento na sua área do banco de dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
            <Button onClick={handleTestFirestore} disabled={firestoreStatus === 'loading'}>
                {firestoreStatus === 'loading' ? 'Testando...' : 'Testar Conexão com Firestore'}
            </Button>
            <div className="h-8 w-8 flex items-center justify-center">
                {renderStatusIcon(firestoreStatus)}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste do Cloud Storage (Arquivos)</CardTitle>
           <CardDescription>
            Este teste tentará enviar, obter a URL e depois apagar um arquivo de teste na sua área de armazenamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
            <Button onClick={handleTestStorage} disabled={storageStatus === 'loading'}>
                {storageStatus === 'loading' ? 'Testando...' : 'Testar Conexão com Storage'}
            </Button>
            <div className="h-8 w-8 flex items-center justify-center">
                {renderStatusIcon(storageStatus)}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
