import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { ROLE_OPTIONS, DEPARTMENT_OPTIONS, COMMISSION_TYPE_OPTIONS, EmployeeFormData } from '../types';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeFormDialog({ open, onOpenChange }: EmployeeFormDialogProps) {
  const { createEmployee } = useEmployees();
  
  const [form, setForm] = useState<EmployeeFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'attendant',
    department: 'service',
    salary_cents: 0,
    commission_type: 'none',
    commission_percent: 0,
    hire_date: new Date().toISOString().split('T')[0],
  });

  const initialFormState: EmployeeFormData = {
    name: '',
    email: '',
    phone: '',
    role: 'attendant',
    department: 'service',
    salary_cents: 0,
    commission_type: 'none',
    commission_percent: 0,
    hire_date: new Date().toISOString().split('T')[0],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      return;
    }

    await createEmployee.mutateAsync(form);
    onOpenChange(false);
    // Reset form
    setForm(initialFormState);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Funcionário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Cargo *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Select
                value={form.department || ''}
                onValueChange={(v) => setForm({ ...form, department: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Salário (R$)</Label>
              <Input
                id="salary"
                type="number"
                step="0.01"
                value={(form.salary_cents / 100).toFixed(2)}
                onChange={(e) => setForm({ ...form, salary_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hire_date">Data de Contratação</Label>
              <Input
                id="hire_date"
                type="date"
                value={form.hire_date || ''}
                onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commission_type">Tipo de Comissão</Label>
              <Select
                value={form.commission_type}
                onValueChange={(v) => setForm({ ...form, commission_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMISSION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.commission_type !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="commission_percent">% Comissão</Label>
                <Input
                  id="commission_percent"
                  type="number"
                  step="0.1"
                  value={form.commission_percent || 0}
                  onChange={(e) => setForm({ ...form, commission_percent: parseFloat(e.target.value || '0') })}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
