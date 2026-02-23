import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Settings, GripVertical, Plus, Trash2, Eye, EyeOff, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useOperatorTerminalSettings,
  useUpsertOperatorTerminalSettings,
  DEFAULT_MODULE_COLORS,
} from '@/hooks/useOperatorTerminalSettings';

interface Module {
  id: string;
  label: string;
  icon: any;
}

interface TerminalSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allModules: Module[];
}

const TERMINAL_BG_OPTIONS = [
  { value: 'bg-slate-950', label: 'Escuro' },
  { value: 'bg-slate-900', label: 'Cinza Escuro' },
  { value: 'bg-zinc-900', label: 'Zinco' },
  { value: 'bg-neutral-900', label: 'Neutro' },
  { value: 'bg-blue-950', label: 'Azul Escuro' },
  { value: 'bg-purple-950', label: 'Roxo Escuro' },
];

const CARD_BG_COLOR_OPTIONS = [
  { value: 'bg-white', label: 'Branco', textClass: 'text-gray-800' },
  { value: 'bg-blue-600', label: 'Azul', textClass: 'text-white' },
  { value: 'bg-purple-600', label: 'Roxo', textClass: 'text-white' },
  { value: 'bg-violet-600', label: 'Violeta', textClass: 'text-white' },
  { value: 'bg-emerald-600', label: 'Esmeralda', textClass: 'text-white' },
  { value: 'bg-green-600', label: 'Verde', textClass: 'text-white' },
  { value: 'bg-orange-600', label: 'Laranja', textClass: 'text-white' },
  { value: 'bg-pink-600', label: 'Rosa', textClass: 'text-white' },
  { value: 'bg-red-600', label: 'Vermelho', textClass: 'text-white' },
  { value: 'bg-cyan-600', label: 'Ciano', textClass: 'text-white' },
  { value: 'bg-amber-600', label: 'Âmbar', textClass: 'text-white' },
  { value: 'bg-indigo-600', label: 'Índigo', textClass: 'text-white' },
  { value: 'bg-teal-600', label: 'Azul-petróleo', textClass: 'text-white' },
];

const ICON_COLOR_OPTIONS = [
  { value: 'text-white', label: 'Branco' },
  { value: 'text-gray-800', label: 'Escuro' },
  { value: 'text-blue-500', label: 'Azul' },
  { value: 'text-purple-500', label: 'Roxo' },
  { value: 'text-emerald-500', label: 'Esmeralda' },
  { value: 'text-orange-500', label: 'Laranja' },
  { value: 'text-pink-500', label: 'Rosa' },
  { value: 'text-cyan-500', label: 'Ciano' },
];

// Sortable Terminal Module Item
function SortableTerminalModule({
  module,
  isActive,
  cardBgColor,
  iconColor,
  onToggleActive,
  onRemove,
  onBgColorChange,
  onIconColorChange,
}: {
  module: Module;
  isActive: boolean;
  cardBgColor: string;
  iconColor: string;
  onToggleActive: () => void;
  onRemove: () => void;
  onBgColorChange: (color: string) => void;
  onIconColorChange: (color: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = module.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all",
        isDragging && "opacity-50 shadow-lg z-50",
        !isActive && "opacity-50"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Card preview */}
      <div
        className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border",
          cardBgColor,
          cardBgColor === 'bg-white' && "border-gray-300"
        )}
      >
        <Icon className={cn("w-6 h-6", iconColor)} />
      </div>

      {/* Module name */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{module.label}</p>
        <p className="text-xs text-muted-foreground">
          {isActive ? 'Visível' : 'Oculto'}
        </p>
      </div>

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Alterar cores do card"
          >
            <Palette className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end" side="left">
          <div className="space-y-4">
            {/* Background color */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Cor de Fundo</p>
              <div className="grid grid-cols-4 gap-2">
                {CARD_BG_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => onBgColorChange(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110",
                      color.value,
                      color.value === 'bg-white' && "border-gray-300",
                      cardBgColor === color.value ? "ring-2 ring-offset-2 ring-offset-background ring-primary border-primary" : "border-transparent"
                    )}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Icon color */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Cor do Ícone</p>
              <div className="grid grid-cols-4 gap-2">
                {ICON_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => onIconColorChange(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center bg-muted",
                      iconColor === color.value ? "ring-2 ring-offset-2 ring-offset-background ring-primary border-primary" : "border-transparent"
                    )}
                    title={color.label}
                  >
                    <div className={cn("w-4 h-4 rounded-full", color.value.replace('text-', 'bg-'))} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Toggle visibility */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleActive}
        className={cn(
          "shrink-0",
          isActive ? "text-green-500 hover:text-green-600" : "text-muted-foreground hover:text-foreground"
        )}
        title={isActive ? 'Ocultar do terminal' : 'Mostrar no terminal'}
      >
        {isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
      </Button>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0 text-muted-foreground hover:text-destructive"
        title="Remover do terminal"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function TerminalSettingsDialog({
  open,
  onOpenChange,
  allModules,
}: TerminalSettingsDialogProps) {
  const { data: settings, isLoading } = useOperatorTerminalSettings();
  const upsertSettings = useUpsertOperatorTerminalSettings();

  // Terminal modules = modules added to terminal (in order)
  const [terminalModuleIds, setTerminalModuleIds] = useState<string[]>([]);
  // Active status per module
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>({});
  // Module background colors
  const [moduleBgColors, setModuleBgColors] = useState<Record<string, string>>({});
  // Module icon colors
  const [moduleIconColors, setModuleIconColors] = useState<Record<string, string>>({});
  // Background color
  const [backgroundColor, setBackgroundColor] = useState('bg-slate-950');
  // Module to add (dropdown selection)
  const [selectedModuleToAdd, setSelectedModuleToAdd] = useState<string>('');
  // Track if initialized to prevent resetting on settings update
  const [isInitialized, setIsInitialized] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Modules available to add (not yet in terminal)
  const availableToAdd = useMemo(() => {
    return allModules.filter(m => !terminalModuleIds.includes(m.id));
  }, [allModules, terminalModuleIds]);

  // Terminal modules with full data
  const terminalModules = useMemo(() => {
    return terminalModuleIds
      .map(id => allModules.find(m => m.id === id))
      .filter((m): m is Module => m !== undefined);
  }, [terminalModuleIds, allModules]);

  // Parse module_colors to separate bg and icon colors
  const parseModuleColors = (colors: Record<string, string>) => {
    const bgColors: Record<string, string> = {};
    const iconColors: Record<string, string> = {};
    
    Object.entries(colors).forEach(([key, value]) => {
      if (key.endsWith('_icon')) {
        iconColors[key.replace('_icon', '')] = value;
      } else {
        bgColors[key] = value;
      }
    });
    
    return { bgColors, iconColors };
  };

  // Combine bg and icon colors for saving
  const combineModuleColors = (bgColors: Record<string, string>, iconColors: Record<string, string>) => {
    const combined: Record<string, string> = { ...bgColors };
    Object.entries(iconColors).forEach(([key, value]) => {
      combined[`${key}_icon`] = value;
    });
    return combined;
  };

  // Initialize state from settings - only once when dialog opens
  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
      return;
    }
    
    if (isInitialized) return;
    
    if (settings) {
      // Use saved order, or default to all modules
      const savedOrder = settings.module_order.length > 0 
        ? settings.module_order 
        : allModules.map(m => m.id);
      
      // Filter to only include valid module IDs
      const validIds = savedOrder.filter(id => allModules.some(m => m.id === id));
      setTerminalModuleIds(validIds);
      
      // Set active status based on enabled_modules
      const active: Record<string, boolean> = {};
      validIds.forEach(id => {
        active[id] = settings.enabled_modules.length === 0 || settings.enabled_modules.includes(id);
      });
      setActiveModules(active);
      
      // Parse and set module colors
      const { bgColors, iconColors } = parseModuleColors(settings.module_colors || DEFAULT_MODULE_COLORS);
      setModuleBgColors({ ...DEFAULT_MODULE_COLORS, ...bgColors });
      setModuleIconColors(iconColors);
      
      setBackgroundColor(settings.background_color || 'bg-slate-950');
    } else {
      // Default: all modules enabled
      const allIds = allModules.map(m => m.id);
      setTerminalModuleIds(allIds);
      const active: Record<string, boolean> = {};
      allIds.forEach(id => { active[id] = true; });
      setActiveModules(active);
      setModuleBgColors(DEFAULT_MODULE_COLORS);
      setModuleIconColors({});
      setBackgroundColor('bg-slate-950');
    }
    
    setIsInitialized(true);
  }, [open, settings, allModules, isInitialized]);

  const handleBgColorChange = (moduleId: string, color: string) => {
    setModuleBgColors(prev => ({
      ...prev,
      [moduleId]: color
    }));
  };

  const handleIconColorChange = (moduleId: string, color: string) => {
    setModuleIconColors(prev => ({
      ...prev,
      [moduleId]: color
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTerminalModuleIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddModule = () => {
    if (!selectedModuleToAdd) return;
    
    // Prevent duplicates
    if (terminalModuleIds.includes(selectedModuleToAdd)) {
      toast.error('Este módulo já está no terminal');
      return;
    }
    
    setTerminalModuleIds(prev => [...prev, selectedModuleToAdd]);
    setActiveModules(prev => ({ ...prev, [selectedModuleToAdd]: true }));
    // Set default color if not already set
    if (!moduleBgColors[selectedModuleToAdd]) {
      setModuleBgColors(prev => ({
        ...prev,
        [selectedModuleToAdd]: DEFAULT_MODULE_COLORS[selectedModuleToAdd] || 'bg-blue-600'
      }));
    }
    setSelectedModuleToAdd('');
  };

  const handleRemoveModule = (moduleId: string) => {
    setTerminalModuleIds(prev => prev.filter(id => id !== moduleId));
    setActiveModules(prev => {
      const { [moduleId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleToggleActive = (moduleId: string) => {
    setActiveModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleSave = async () => {
    try {
      // enabled_modules = only the active ones
      const enabledModules = terminalModuleIds.filter(id => activeModules[id]);
      
      // Combine bg and icon colors for storage
      const combinedColors = combineModuleColors(moduleBgColors, moduleIconColors);
      
      await upsertSettings.mutateAsync({
        enabled_modules: enabledModules,
        module_order: terminalModuleIds,
        module_colors: combinedColors,
        module_sizes: settings?.module_sizes || {},
        background_color: backgroundColor,
      });
      toast.success('Configurações salvas com sucesso!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar Terminal Operador
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 py-2">
            {/* Background Color */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cor de Fundo</Label>
              <Select value={backgroundColor} onValueChange={setBackgroundColor}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-5 h-5 rounded border border-muted", backgroundColor)} />
                    <span>{TERMINAL_BG_OPTIONS.find(b => b.value === backgroundColor)?.label || 'Selecione'}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {TERMINAL_BG_OPTIONS.map((bg) => (
                    <SelectItem key={bg.value} value={bg.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-5 h-5 rounded border border-muted", bg.value)} />
                        <span>{bg.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add Module Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Adicionar Módulo</Label>
              <div className="flex gap-2">
                <Select value={selectedModuleToAdd} onValueChange={setSelectedModuleToAdd}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um módulo..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {availableToAdd.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Todos os módulos já foram adicionados
                      </div>
                    ) : (
                      availableToAdd.map((mod) => {
                        const Icon = mod.icon;
                        return (
                          <SelectItem key={mod.id} value={mod.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{mod.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddModule}
                  disabled={!selectedModuleToAdd}
                  size="icon"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Terminal Modules List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Módulos do Terminal</Label>
                <span className="text-xs text-muted-foreground">
                  {terminalModules.filter(m => activeModules[m.id]).length} ativos
                </span>
              </div>

              {terminalModules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <p className="text-sm">Nenhum módulo adicionado</p>
                  <p className="text-xs mt-1">Use o dropdown acima para adicionar</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={terminalModuleIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {terminalModules.map((mod) => (
                        <SortableTerminalModule
                          key={mod.id}
                          module={mod}
                          isActive={activeModules[mod.id] ?? true}
                          cardBgColor={moduleBgColors[mod.id] || DEFAULT_MODULE_COLORS[mod.id] || 'bg-blue-600'}
                          iconColor={moduleIconColors[mod.id] || 'text-white'}
                          onToggleActive={() => handleToggleActive(mod.id)}
                          onRemove={() => handleRemoveModule(mod.id)}
                          onBgColorChange={(color) => handleBgColorChange(mod.id, color)}
                          onIconColorChange={(color) => handleIconColorChange(mod.id, color)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <p className="text-xs text-muted-foreground">
                Arraste os módulos para reordenar. A ordem aqui define a ordem no terminal.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={upsertSettings.isPending}>
            {upsertSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
