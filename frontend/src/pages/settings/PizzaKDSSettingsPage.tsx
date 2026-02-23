import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pizza, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { usePizzaKDSSettings, usePizzaKDSOperators, PIZZA_KDS_STEP_LABELS, PIZZA_KDS_STEP_ORDER, PizzaKDSStep } from '@/hooks/usePizzaKDSSettings';
import { toast } from 'sonner';

export default function PizzaKDSSettingsPage() {
  const { settings, isLoading, updateSettings } = usePizzaKDSSettings();
  const { operators, createOperator, updateOperator, deleteOperator } = usePizzaKDSOperators();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<string | null>(null);

  // New operator form state
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newStep, setNewStep] = useState<PizzaKDSStep>('dough_border');

  const handleToggleEnabled = async () => {
    await updateSettings.mutateAsync({ is_enabled: !settings.is_enabled });
  };

  const handleToggleStep = async (step: string) => {
    const field = `step_${step}_enabled` as keyof typeof settings;
    await updateSettings.mutateAsync({ [field]: !settings[field] });
  };

  const handleCreateOperator = async () => {
    if (!newName.trim() || !newPin.trim() || newPin.length !== 4) {
      toast.error('Nome e PIN de 4 dígitos são obrigatórios');
      return;
    }

    await createOperator.mutateAsync({
      name: newName.trim(),
      pin: newPin,
      assigned_step: newStep,
    });

    setNewName('');
    setNewPin('');
    setNewStep('dough_border');
    setIsCreateOpen(false);
  };

  const handleDeleteOperator = async (id: string) => {
    await deleteOperator.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pizza className="w-6 h-6" />
            KDS Multi-Etapas de Pizza
          </h1>
          <p className="text-muted-foreground">
            Configure o sistema de produção multi-etapas exclusivo para pizzas
          </p>
        </div>

        {/* Enable/Disable */}
        <Card>
          <CardHeader>
            <CardTitle>Ativar KDS de Pizza</CardTitle>
            <CardDescription>
              Quando ativado, os pedidos de pizza passarão por um fluxo de produção em etapas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">KDS Multi-Etapas</p>
                <p className="text-sm text-muted-foreground">
                  {settings.is_enabled ? 'Ativo' : 'Inativo'}
                </p>
              </div>
              <Switch
                checked={settings.is_enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={updateSettings.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Steps Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Etapas de Produção</CardTitle>
            <CardDescription>
              Configure quais etapas estarão ativas no fluxo de produção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PIZZA_KDS_STEP_ORDER.map((step) => {
              const field = `step_${step}_enabled` as keyof typeof settings;
              const isEnabled = settings[field] as boolean;

              return (
                <div key={step} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{PIZZA_KDS_STEP_LABELS[step]}</p>
                    {step === 'dough_border' && (
                      <p className="text-xs text-muted-foreground">
                        Massa e borda são preparadas juntas nesta etapa
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggleStep(step)}
                    disabled={updateSettings.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Operators */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Operadores</CardTitle>
              <CardDescription>
                Cadastre os operadores e atribua cada um a uma etapa de produção
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Operador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Operador</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      placeholder="Nome do operador"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PIN (4 dígitos)</Label>
                    <Input
                      placeholder="0000"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Etapa Atribuída</Label>
                    <Select value={newStep} onValueChange={(v) => setNewStep(v as PizzaKDSStep)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PIZZA_KDS_STEP_ORDER.map((step) => (
                          <SelectItem key={step} value={step}>
                            {PIZZA_KDS_STEP_LABELS[step]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button onClick={handleCreateOperator} disabled={createOperator.isPending}>
                    {createOperator.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {operators.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum operador cadastrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">{op.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {PIZZA_KDS_STEP_LABELS[op.assigned_step]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={op.is_active ? 'default' : 'secondary'}>
                          {op.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Operador</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover {op.name}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteOperator(op.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* PWA Info */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso ao PWA</CardTitle>
            <CardDescription>
              Os operadores acessam o KDS de Pizza através do link abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-mono">/pwa/pizza-kds</p>
              <p className="text-xs text-muted-foreground mt-2">
                Os operadores inserem o slug do restaurante e depois seu PIN pessoal para acessar
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
