import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Switch } from '@/components/ui/switch';
import { useChartOfAccounts, ChartAccount } from '@/hooks/useChartOfAccounts';
import { 
  Plus, Trash2, Edit, ChevronRight, ChevronDown,
  TrendingDown, TrendingUp, Building, CreditCard, Loader2
} from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'expense', label: 'Despesa', icon: TrendingDown, color: 'text-red-500' },
  { value: 'income', label: 'Receita', icon: TrendingUp, color: 'text-green-500' },
  { value: 'asset', label: 'Ativo', icon: Building, color: 'text-blue-500' },
  { value: 'liability', label: 'Passivo', icon: CreditCard, color: 'text-orange-500' },
];

export default function ChartOfAccounts() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, toggleActive } = useChartOfAccounts();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    account_type: 'expense' | 'income' | 'asset' | 'liability';
    parent_id: string;
  }>({
    code: '',
    name: '',
    account_type: 'expense',
    parent_id: '',
  });

  // Calcular nível e próximo código automaticamente
  const selectedParent = formData.parent_id ? accounts.find(a => a.id === formData.parent_id) : null;
  const calculatedLevel = selectedParent ? selectedParent.level + 1 : 1;

  // Gerar próximo código baseado no pai
  const getNextCode = (parentId: string | null): string => {
    if (!parentId) {
      // Conta raiz - encontrar próximo número de 1º nível
      const rootAccounts = accounts.filter(a => !a.parent_id);
      const maxRoot = rootAccounts.reduce((max, a) => {
        const num = parseInt(a.code.split('.')[0]) || 0;
        return num > max ? num : max;
      }, 0);
      return String(maxRoot + 1);
    }

    const parent = accounts.find(a => a.id === parentId);
    if (!parent) return '';

    // Encontrar filhos do pai
    const siblings = accounts.filter(a => a.parent_id === parentId);
    if (siblings.length === 0) {
      return `${parent.code}.1`;
    }

    // Encontrar próximo número
    const maxSibling = siblings.reduce((max, a) => {
      const parts = a.code.split('.');
      const lastPart = parseInt(parts[parts.length - 1]) || 0;
      return lastPart > max ? lastPart : max;
    }, 0);

    return `${parent.code}.${maxSibling + 1}`;
  };

  const resetForm = () => {
    setFormData({ code: '', name: '', account_type: 'expense', parent_id: '' });
    setEditingAccount(null);
  };

  const handleParentChange = (value: string) => {
    const parentId = value === '__none__' ? '' : value;
    const newCode = editingAccount ? formData.code : getNextCode(parentId || null);
    
    // Se selecionar pai, herdar o tipo do pai
    const parent = parentId ? accounts.find(a => a.id === parentId) : null;
    const newType = parent ? parent.account_type : formData.account_type;
    
    setFormData({ 
      ...formData, 
      parent_id: parentId, 
      code: newCode,
      account_type: newType as 'expense' | 'income' | 'asset' | 'liability'
    });
  };

  // Abrir dialog para editar conta existente
  const handleEditAccount = (account: ChartAccount) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      account_type: account.account_type,
      parent_id: account.parent_id || '',
    });
    setIsDialogOpen(true);
  };

  // Abrir dialog para adicionar subconta (filho) de uma conta específica
  const handleAddChildAccount = (parentAccount: ChartAccount) => {
    const nextCode = getNextCode(parentAccount.id);
    setEditingAccount(null);
    setFormData({
      code: nextCode,
      name: '',
      account_type: parentAccount.account_type,
      parent_id: parentAccount.id,
    });
    setIsDialogOpen(true);
  };

  // Abrir dialog para nova conta raiz
  const handleOpenDialog = () => {
    const nextRootCode = getNextCode(null);
    setFormData({ 
      code: nextRootCode, 
      name: '', 
      account_type: 'expense', 
      parent_id: '' 
    });
    setEditingAccount(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingAccount) {
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        ...formData,
        parent_id: formData.parent_id || null,
        level: calculatedLevel,
      });
    } else {
      await createAccount.mutateAsync({
        ...formData,
        parent_id: formData.parent_id || null,
        level: calculatedLevel,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAccount.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  // Filtrar e organizar contas
  const filteredAccounts = accounts.filter(a => {
    if (filterType !== 'all' && a.account_type !== filterType) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.code.includes(search)) return false;
    return true;
  });

  // Construir hierarquia
  const rootAccounts = filteredAccounts.filter(a => !a.parent_id || !filteredAccounts.find(p => p.id === a.parent_id));
  const getChildren = (parentId: string) => filteredAccounts.filter(a => a.parent_id === parentId);

  const renderRow = (account: ChartAccount, depth = 0) => {
    const children = getChildren(account.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(account.id);
    const typeInfo = ACCOUNT_TYPES.find(t => t.value === account.account_type);
    const TypeIcon = typeInfo?.icon || TrendingDown;

    return (
      <>
        <TableRow key={account.id} className={!account.is_active ? 'opacity-50' : ''}>
          <TableCell className="font-mono">
            <div className="flex items-center" style={{ paddingLeft: depth * 24 }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 mr-1"
                  onClick={() => toggleExpand(account.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : (
                <span className="w-7" />
              )}
              {account.code}
            </div>
          </TableCell>
          <TableCell>{account.name}</TableCell>
          <TableCell>
            <Badge variant="outline" className="flex items-center gap-1 w-fit">
              <TypeIcon className={`h-3 w-3 ${typeInfo?.color}`} />
              {typeInfo?.label}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant="secondary" className="text-xs">
              Nível {account.level}
            </Badge>
          </TableCell>
          <TableCell>
            <Switch
              checked={account.is_active}
              onCheckedChange={(checked) => toggleActive.mutate({ id: account.id, is_active: checked })}
            />
          </TableCell>
          <TableCell className="text-right space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleAddChildAccount(account)}
              title="Adicionar subconta"
            >
              <Plus className="h-4 w-4 text-green-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEditAccount(account)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(account.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && children.map(child => renderRow(child, depth + 1))}
      </>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Plano de Contas</h1>
            <p className="text-muted-foreground">
              Gerencie categorias contábeis para classificar despesas e receitas
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta Raiz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Primeiro: selecionar conta pai para definir hierarquia */}
                <div className="space-y-2">
                  <Label>Conta Pai</Label>
                  <Select
                    value={formData.parent_id || '__none__'}
                    onValueChange={handleParentChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma (conta raiz)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma (conta raiz)</SelectItem>
                      {accounts
                        .filter(a => a.id !== editingAccount?.id)
                        .sort((a, b) => a.code.localeCompare(b.code))
                        .map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.parent_id 
                      ? `Nível ${calculatedLevel} (subconta de ${selectedParent?.code})`
                      : 'Nível 1 (conta raiz)'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="1.1.01"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Sugestão automática baseada no pai</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => setFormData({ ...formData, account_type: value as 'expense' | 'income' | 'asset' | 'liability' })}
                      disabled={!!formData.parent_id}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.parent_id && (
                      <p className="text-xs text-muted-foreground">Herdado da conta pai</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome da Conta</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Custos Operacionais"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={!formData.code || !formData.name || createAccount.isPending || updateAccount.isPending}
                >
                  {(createAccount.isPending || updateAccount.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingAccount ? 'Salvar Alterações' : 'Criar Conta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Resumo por tipo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ACCOUNT_TYPES.map(type => {
            const count = accounts.filter(a => a.account_type === type.value).length;
            const Icon = type.icon;
            return (
              <Card 
                key={type.value}
                className={`cursor-pointer transition-all ${filterType === type.value ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setFilterType(filterType === type.value ? 'all' : type.value)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{type.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${type.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Buscar por código ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              {filterType !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setFilterType('all')}>
                  Limpar filtro
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead className="w-[80px]">Nível</TableHead>
                  <TableHead className="w-[80px]">Ativo</TableHead>
                  <TableHead className="text-right w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rootAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma conta cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  rootAccounts.map(account => renderRow(account))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
