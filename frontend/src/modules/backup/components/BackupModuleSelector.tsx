import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Package, 
  FolderTree, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Warehouse, 
  Settings, 
  BarChart3, 
  UserCog 
} from 'lucide-react';
import { BACKUP_MODULES } from '../types';

interface BackupModuleSelectorProps {
  selectedModules: Record<string, boolean>;
  onModuleChange: (moduleId: string, checked: boolean) => void;
  disabled?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Package,
  FolderTree,
  Users,
  ShoppingBag,
  DollarSign,
  Warehouse,
  Settings,
  BarChart3,
  UserCog,
};

export function BackupModuleSelector({ 
  selectedModules, 
  onModuleChange, 
  disabled = false 
}: BackupModuleSelectorProps) {
  const allSelected = BACKUP_MODULES.every(m => selectedModules[`include_${m.id}`] !== false);

  const handleSelectAll = () => {
    const newValue = !allSelected;
    BACKUP_MODULES.forEach(m => {
      onModuleChange(`include_${m.id}`, newValue);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Módulos para Backup</Label>
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={disabled}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {BACKUP_MODULES.map((module) => {
          const Icon = ICON_MAP[module.icon] || Package;
          const fieldKey = `include_${module.id}`;
          const isChecked = selectedModules[fieldKey] !== false;
          
          return (
            <Card 
              key={module.id}
              className={`cursor-pointer transition-all ${
                isChecked ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onModuleChange(fieldKey, !isChecked)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isChecked}
                    disabled={disabled}
                    onCheckedChange={(checked) => onModuleChange(fieldKey, !!checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{module.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {module.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
