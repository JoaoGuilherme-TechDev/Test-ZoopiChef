import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Key, 
  UserCheck, 
  UserX, 
  Trash2, 
  Lock, 
  Unlock,
  Users,
  Phone,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useWaiters, Waiter, CreateWaiterInput } from '@/hooks/useWaiters';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SettingsWaiters() {
  const { 
    waiters, 
    isLoading, 
    refetch,
    createWaiter, 
    updateWaiter, 
    changePin, 
    toggleActive, 
    deleteWaiter,
    unlockWaiter,
  } = useWaiters();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Form states
  const [newWaiter, setNewWaiter] = useState<CreateWaiterInput>({ name: '', phone: '', pin: '' });
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPin, setNewPin] = useState('');

  const activeWaiters = waiters.filter(w => w.active);
  const inactiveWaiters = waiters.filter(w => !w.active);
  const displayedWaiters = showInactive ? waiters : activeWaiters;

  const handleCreate = () => {
    if (!newWaiter.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!newWaiter.pin || newWaiter.pin.length < 4) {
      toast.error('PIN deve ter pelo menos 4 dígitos');
      return;
    }
    
    createWaiter.mutate(newWaiter, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setNewWaiter({ name: '', phone: '', pin: '' });
      },
    });
  };

  const handleEdit = () => {
    if (!selectedWaiter || !editName.trim()) return;
    
    updateWaiter.mutate({
      id: selectedWaiter.id,
      name: editName,
      phone: editPhone,
    }, {
      onSuccess: () => {
        setEditDialogOpen(false);
        setSelectedWaiter(null);
      },
    });
  };

  const handleChangePin = () => {
    if (!selectedWaiter || !newPin) return;
    
    changePin.mutate({
      id: selectedWaiter.id,
      newPin,
    }, {
      onSuccess: () => {
        setPinDialogOpen(false);
        setSelectedWaiter(null);
        setNewPin('');
      },
    });
  };

  const handleDelete = () => {
    if (!selectedWaiter) return;
    
    deleteWaiter.mutate(selectedWaiter.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedWaiter(null);
      },
    });
  };

  const openEditDialog = (waiter: Waiter) => {
    setSelectedWaiter(waiter);
    setEditName(waiter.name);
    setEditPhone(waiter.phone || '');
    setEditDialogOpen(true);
  };

  const openPinDialog = (waiter: Waiter) => {
    setSelectedWaiter(waiter);
    setNewPin('');
    setPinDialogOpen(true);
  };

  const openDeleteDialog = (waiter: Waiter) => {
    setSelectedWaiter(waiter);
    setDeleteDialogOpen(true);
  };

  const isLocked = (waiter: Waiter) => {
    return waiter.locked_until && new Date(waiter.locked_until) > new Date();
  };

  return (
    <DashboardLayout title="Garçons">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Garçons
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os garçons que podem acessar o App Garçom via PIN
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Garçom
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Garçom</DialogTitle>
                  <DialogDescription>
                    Crie um novo garçom com PIN de acesso para o App Garçom
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      placeholder="Nome do garçom"
                      value={newWaiter.name}
                      onChange={(e) => setNewWaiter(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (opcional)</Label>
                    <Input
                      id="phone"
                      placeholder="(99) 99999-9999"
                      value={newWaiter.phone || ''}
                      onChange={(e) => setNewWaiter(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin">PIN de Acesso (4-6 dígitos) *</Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={newWaiter.pin}
                      onChange={(e) => setNewWaiter(p => ({ ...p, pin: e.target.value.replace(/\D/g, '') }))}
                      className="text-center text-lg tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground">
                      Este PIN será usado pelo garçom para acessar o App Garçom
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={createWaiter.isPending || !newWaiter.name.trim() || newWaiter.pin.length < 4}
                  >
                    {createWaiter.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</>
                    ) : (
                      'Criar Garçom'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <UserCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{activeWaiters.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-muted">
                  <UserX className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inativos</p>
                  <p className="text-2xl font-bold">{inactiveWaiters.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <Lock className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bloqueados</p>
                  <p className="text-2xl font-bold">
                    {waiters.filter(w => isLocked(w)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Waiters Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de Garçons</CardTitle>
              <CardDescription>
                {displayedWaiters.length} garçon(s) {showInactive ? '' : 'ativo(s)'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-inactive" className="text-sm">Mostrar inativos</Label>
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : displayedWaiters.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium text-muted-foreground">
                  Nenhum garçom cadastrado
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Clique em "Novo Garçom" para cadastrar
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedWaiters.map((waiter) => (
                    <TableRow key={waiter.id} className={!waiter.active ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{waiter.name}</p>
                            {isLocked(waiter) && (
                              <div className="flex items-center gap-1 text-destructive text-xs">
                                <Lock className="w-3 h-3" />
                                Bloqueado até {new Date(waiter.locked_until!).toLocaleTimeString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {waiter.phone ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" />
                            {waiter.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {waiter.active ? (
                          <Badge variant="default" className="bg-emerald-500">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <UserX className="w-3 h-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {waiter.last_login_at ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(waiter.last_login_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Nunca acessou</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(waiter)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPinDialog(waiter)}>
                              <Key className="w-4 h-4 mr-2" />
                              Alterar PIN
                            </DropdownMenuItem>
                            {isLocked(waiter) && (
                              <DropdownMenuItem 
                                onClick={() => unlockWaiter.mutate(waiter.id)}
                                className="text-primary"
                              >
                                <Unlock className="w-4 h-4 mr-2" />
                                Desbloquear
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleActive.mutate({ id: waiter.id, active: !waiter.active })}
                            >
                              {waiter.active ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(waiter)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <ShieldCheck className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Como funciona o acesso do Garçom?</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• O garçom acessa o App Garçom pelo link do restaurante</li>
                  <li>• Seleciona seu nome na lista e digita o PIN de 4-6 dígitos</li>
                  <li>• Após 5 tentativas erradas, a conta é bloqueada por 15 minutos</li>
                  <li>• Garçons inativos não conseguem fazer login</li>
                  <li>• O PIN é armazenado de forma segura (hash)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Garçom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={updateWaiter.isPending}>
              {updateWaiter.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar PIN</DialogTitle>
            <DialogDescription>
              Definir novo PIN de acesso para {selectedWaiter?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-pin">Novo PIN (4-6 dígitos)</Label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="text-center text-lg tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleChangePin} 
              disabled={changePin.isPending || newPin.length < 4}
            >
              {changePin.isPending ? 'Alterando...' : 'Alterar PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Garçom?</AlertDialogTitle>
            <AlertDialogDescription>
              O garçom <strong>{selectedWaiter?.name}</strong> será desativado e não poderá mais acessar o App Garçom.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
