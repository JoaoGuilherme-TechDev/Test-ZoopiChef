import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTips, Tip, CreateTipParams } from '@/hooks/useTips';
import { formatCurrency } from '@/lib/format';
import { Loader2, Plus, Users, DollarSign, TrendingUp, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'cash', label: 'Dinheiro' },
];

export function TipsManagement() {
  const [showAddTip, setShowAddTip] = useState(false);
  const [showDistribute, setShowDistribute] = useState<Tip | null>(null);
  const { tips, isLoading, stats, createTip, distributeTip, markDistributionPaid } = useTips();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gorjetas</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalTips / 100)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Distribuídas</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.distributedTips / 100)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.pendingTips / 100)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registros</p>
                <p className="text-2xl font-bold">{stats.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips List */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gorjetas</CardTitle>
            <CardDescription>Gerenciamento e distribuição de gorjetas</CardDescription>
          </div>
          <Button onClick={() => setShowAddTip(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Gorjeta
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : tips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma gorjeta registrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Forma Pgto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tips.map((tip) => (
                  <TableRow key={tip.id}>
                    <TableCell>
                      {format(new Date(tip.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(tip.amount_cents / 100)}
                    </TableCell>
                    <TableCell>
                      {tip.tip_percentage ? `${tip.tip_percentage}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {tip.payment_method?.toUpperCase() || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tip.distributed ? 'default' : 'secondary'}>
                        {tip.distributed ? 'Distribuída' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!tip.distributed && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowDistribute(tip)}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          Distribuir
                        </Button>
                      )}
                      {tip.distributed && tip.distributions && (
                        <span className="text-sm text-muted-foreground">
                          {tip.distributions.length} funcionário(s)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Tip Dialog */}
      <AddTipDialog 
        open={showAddTip} 
        onOpenChange={setShowAddTip}
        onSubmit={async (params) => {
          await createTip.mutateAsync(params);
          setShowAddTip(false);
        }}
        isLoading={createTip.isPending}
      />

      {/* Distribute Dialog */}
      {showDistribute && (
        <DistributeTipDialog
          open={!!showDistribute}
          onOpenChange={() => setShowDistribute(null)}
          tip={showDistribute}
          onDistribute={async (distributions) => {
            await distributeTip.mutateAsync({
              tipId: showDistribute.id,
              distributions,
            });
            setShowDistribute(null);
          }}
          isLoading={distributeTip.isPending}
        />
      )}
    </div>
  );
}

interface AddTipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: CreateTipParams) => Promise<void>;
  isLoading: boolean;
}

function AddTipDialog({ open, onOpenChange, onSubmit, isLoading }: AddTipDialogProps) {
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      amountCents: Math.round(parseFloat(amount) * 100),
      tipPercentage: percentage ? parseFloat(percentage) : undefined,
      paymentMethod,
      notes: notes || undefined,
    });
    setAmount('');
    setPercentage('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Gorjeta</DialogTitle>
          <DialogDescription>Adicione uma nova gorjeta ao sistema</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">Percentual (%)</Label>
            <Input
              id="percentage"
              type="number"
              step="0.1"
              placeholder="10"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              placeholder="Opcional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !amount}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DistributeTipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tip: Tip;
  onDistribute: (distributions: { employeeId: string; employeeName: string; sharePercentage: number; amountCents: number }[]) => Promise<void>;
  isLoading: boolean;
}

function DistributeTipDialog({ open, onOpenChange, tip, onDistribute, isLoading }: DistributeTipDialogProps) {
  const [employees, setEmployees] = useState<{ id: string; name: string; percentage: number }[]>([
    { id: crypto.randomUUID(), name: '', percentage: 100 },
  ]);

  const handleAddEmployee = () => {
    setEmployees([...employees, { id: crypto.randomUUID(), name: '', percentage: 0 }]);
  };

  const handleUpdateEmployee = (index: number, field: 'name' | 'percentage', value: string | number) => {
    const updated = [...employees];
    if (field === 'percentage') {
      updated[index].percentage = Number(value);
    } else {
      updated[index].name = value as string;
    }
    setEmployees(updated);
  };

  const handleDistributeEqually = () => {
    const equalPercentage = Math.floor(100 / employees.length);
    const remainder = 100 % employees.length;
    setEmployees(employees.map((e, i) => ({
      ...e,
      percentage: equalPercentage + (i === 0 ? remainder : 0),
    })));
  };

  const totalPercentage = employees.reduce((sum, e) => sum + e.percentage, 0);

  const handleSubmit = async () => {
    const distributions = employees
      .filter(e => e.name && e.percentage > 0)
      .map(e => ({
        employeeId: e.id,
        employeeName: e.name,
        sharePercentage: e.percentage,
        amountCents: Math.round((tip.amount_cents * e.percentage) / 100),
      }));
    await onDistribute(distributions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Distribuir Gorjeta</DialogTitle>
          <DialogDescription>
            Valor total: {formatCurrency(tip.amount_cents / 100)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Funcionários</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDistributeEqually}>
                Dividir Igual
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddEmployee}>
                + Adicionar
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {employees.map((emp, index) => (
              <div key={emp.id} className="flex gap-2">
                <Input
                  placeholder="Nome do funcionário"
                  value={emp.name}
                  onChange={(e) => handleUpdateEmployee(index, 'name', e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={emp.percentage}
                    onChange={(e) => handleUpdateEmployee(index, 'percentage', e.target.value)}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <span className="text-sm text-muted-foreground self-center w-20 text-right">
                  {formatCurrency((tip.amount_cents * emp.percentage / 100) / 100)}
                </span>
              </div>
            ))}
          </div>

          {totalPercentage !== 100 && (
            <p className="text-sm text-destructive">
              Total: {totalPercentage}% (deve ser 100%)
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || totalPercentage !== 100 || employees.every(e => !e.name)}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Distribuir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
