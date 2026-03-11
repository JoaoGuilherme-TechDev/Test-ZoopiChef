import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BATCH_PRODUCT_FIELDS, BatchProductUpdate } from '../types';

interface Props {
  values: BatchProductUpdate;
  enabledFields: Record<string, boolean>;
  onValueChange: (key: keyof BatchProductUpdate, value: any) => void;
  onFieldToggle: (key: string, enabled: boolean) => void;
}

export function BatchFieldsEditor({ values, enabledFields, onValueChange, onFieldToggle }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Marque os campos que deseja alterar e informe os novos valores.
        Campos não marcados permanecerão inalterados.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BATCH_PRODUCT_FIELDS.map((field) => (
          <Card 
            key={field.key} 
            className={`transition-all ${enabledFields[field.key] ? 'ring-2 ring-primary bg-primary/5' : 'opacity-70'}`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={enabledFields[field.key] || false}
                    onCheckedChange={(checked) => onFieldToggle(field.key, !!checked)}
                  />
                  <span className="font-medium">{field.label}</span>
                </Label>
                {enabledFields[field.key] && (
                  <span className="text-xs text-primary font-medium">Será alterado</span>
                )}
              </div>

              {field.type === 'boolean' ? (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={Boolean(values[field.key])}
                    onCheckedChange={(checked) => onValueChange(field.key, checked)}
                    disabled={!enabledFields[field.key]}
                  />
                  <span className="text-sm text-muted-foreground">
                    {values[field.key] ? 'Sim' : 'Não'}
                  </span>
                </div>
              ) : field.type === 'select' ? (
                <Select
                  value={String(values[field.key] || '')}
                  onValueChange={(val) => onValueChange(field.key, val)}
                  disabled={!enabledFields[field.key]}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'number' ? (
                <Input
                  type="number"
                  placeholder={field.placeholder}
                  value={String(values[field.key] ?? '')}
                  onChange={(e) => onValueChange(field.key, e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!enabledFields[field.key]}
                />
              ) : (
                <Input
                  type="text"
                  placeholder={field.placeholder}
                  value={String(values[field.key] || '')}
                  onChange={(e) => onValueChange(field.key, e.target.value)}
                  disabled={!enabledFields[field.key]}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
