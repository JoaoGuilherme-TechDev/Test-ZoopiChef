/**
 * SettingsWaiterPIN - Waiter PIN Management Settings
 * 
 * Allows restaurant admins to set/change/reset the 4-digit PIN
 * required for waiter app access.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Lock, KeyRound, Trash2, Check, Eye, EyeOff } from 'lucide-react';

export default function SettingsWaiterPIN() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Fetch current PIN status
  const { data: pinData, isLoading } = useQuery({
    queryKey: ['waiter_pin_status', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('feature_flags')
        .eq('id', company.id)
        .single();
      
      if (error) throw error;
      
      const flags = data?.feature_flags as Record<string, any> || {};
      return {
        hasPin: !!flags.waiter_pin,
        pin: flags.waiter_pin || null
      };
    },
    enabled: !!company?.id
  });

  // Save PIN mutation
  const savePinMutation = useMutation({
    mutationFn: async (pin: string | null) => {
      if (!company?.id) throw new Error('Company not found');
      
      // Get current feature flags
      const { data: current } = await supabase
        .from('companies')
        .select('feature_flags')
        .eq('id', company.id)
        .single();
      
      const currentFlags = (current?.feature_flags as Record<string, any>) || {};
      
      // Update with new PIN
      const updatedFlags = {
        ...currentFlags,
        waiter_pin: pin
      };
      
      const { error } = await supabase
        .from('companies')
        .update({ feature_flags: updatedFlags })
        .eq('id', company.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter_pin_status', company?.id] });
      setShowChangeModal(false);
      setNewPin('');
      setConfirmPin('');
      toast.success('PIN atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar PIN: ' + error.message);
    }
  });

  const handleSavePin = () => {
    if (newPin.length !== 4) {
      toast.error('O PIN deve ter exatamente 4 dígitos');
      return;
    }
    
    if (newPin !== confirmPin) {
      toast.error('Os PINs não coincidem');
      return;
    }
    
    if (!/^\d{4}$/.test(newPin)) {
      toast.error('O PIN deve conter apenas números');
      return;
    }
    
    savePinMutation.mutate(newPin);
  };

  const handleResetPin = () => {
    if (confirm('Tem certeza que deseja remover o PIN? O app do garçom ficará sem proteção.')) {
      savePinMutation.mutate(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gerenciar PIN do Garçom</h2>
        <p className="text-muted-foreground">Configure o PIN de 4 dígitos para acesso ao app do garçom</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            PIN de Acesso
          </CardTitle>
          <CardDescription>
            Este PIN é usado para autenticar o acesso ao app do garçom após identificar o restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current PIN Status */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className={`w-6 h-6 ${pinData?.hasPin ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {pinData?.hasPin ? 'PIN configurado' : 'Nenhum PIN definido'}
              </p>
              <p className="text-sm text-muted-foreground">
                {pinData?.hasPin 
                  ? `PIN atual: ${showPin ? pinData.pin : '••••'}`
                  : 'O app do garçom está sem proteção por PIN'
                }
              </p>
            </div>
            {pinData?.hasPin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={() => setShowChangeModal(true)}>
              <KeyRound className="w-4 h-4 mr-2" />
              {pinData?.hasPin ? 'Alterar PIN' : 'Definir PIN'}
            </Button>
            
            {pinData?.hasPin && (
              <Button variant="outline" onClick={handleResetPin}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remover PIN
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change PIN Modal */}
      <Dialog open={showChangeModal} onOpenChange={setShowChangeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pinData?.hasPin ? 'Alterar PIN' : 'Definir novo PIN'}</DialogTitle>
            <DialogDescription>
              Digite um PIN de 4 dígitos para proteger o acesso ao app do garçom.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-pin">Novo PIN (4 dígitos)</Label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirmar PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>
            
            {newPin.length === 4 && confirmPin.length === 4 && (
              <div className={`flex items-center gap-2 text-sm ${newPin === confirmPin ? 'text-green-600' : 'text-destructive'}`}>
                {newPin === confirmPin ? (
                  <><Check className="w-4 h-4" /> PINs coincidem</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> PINs não coincidem</>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePin}
              disabled={newPin.length !== 4 || confirmPin.length !== 4 || newPin !== confirmPin || savePinMutation.isPending}
            >
              {savePinMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                'Salvar PIN'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
