import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';
import { TABLE_PDV_SHORTCUT_LABELS } from '@/hooks/useTablePDVKeyboardShortcuts';

interface TablePDVShortcutsHelpProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: boolean;
}

export function TablePDVShortcutsHelp({ 
  open,
  onOpenChange,
  triggerButton = true
}: TablePDVShortcutsHelpProps) {
  const shortcutCategories = [
    {
      title: 'Ações Principais',
      shortcuts: [
        { key: 'F', label: TABLE_PDV_SHORTCUT_LABELS['F'], color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
        { key: 'P', label: TABLE_PDV_SHORTCUT_LABELS['P'], color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
        { key: 'V', label: TABLE_PDV_SHORTCUT_LABELS['V'], color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300' },
      ]
    },
    {
      title: 'Mesa / Comanda',
      shortcuts: [
        { key: 'T', label: TABLE_PDV_SHORTCUT_LABELS['T'], color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
        { key: 'J', label: TABLE_PDV_SHORTCUT_LABELS['J'], color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
        { key: 'R', label: TABLE_PDV_SHORTCUT_LABELS['R'], color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
        { key: 'C', label: TABLE_PDV_SHORTCUT_LABELS['C'], color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
      ]
    },
    {
      title: 'Itens',
      shortcuts: [
        { key: 'Del', label: TABLE_PDV_SHORTCUT_LABELS['Del'], color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
        { key: 'X', label: TABLE_PDV_SHORTCUT_LABELS['X'], color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
      ]
    },
    {
      title: 'Caixa',
      shortcuts: [
        { key: 'G', label: TABLE_PDV_SHORTCUT_LABELS['G'], color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
        { key: 'S', label: TABLE_PDV_SHORTCUT_LABELS['S'], color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
        { key: 'M', label: TABLE_PDV_SHORTCUT_LABELS['M'], color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
        { key: 'Y', label: TABLE_PDV_SHORTCUT_LABELS['Y'], color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
      ]
    },
    {
      title: 'Relatórios e Segurança',
      shortcuts: [
        { key: 'Z', label: TABLE_PDV_SHORTCUT_LABELS['Z'], color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
        { key: '5x Espaço', label: TABLE_PDV_SHORTCUT_LABELS['5x Espaço'], color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
      ]
    },
  ];

  const content = (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Atalhos de Teclado - PDV Mesas
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {shortcutCategories.map((category) => (
          <div key={category.title}>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {category.title}
            </h4>
            <div className="grid gap-2">
              {category.shortcuts.map(({ key, label, color }) => (
                <div 
                  key={key}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="text-sm">{label}</span>
                  <Badge className={`px-2 py-1 text-xs font-mono ${color}`}>
                    {key}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
        <p className="font-medium mb-1">💡 Dica:</p>
        <p>Os atalhos funcionam quando você está visualizando uma mesa/comanda.</p>
        <p>Pressione a tecla correspondente para executar a ação rapidamente.</p>
      </div>
    </>
  );

  if (triggerButton) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Keyboard className="h-4 w-4" />
            <span className="hidden sm:inline">Atalhos</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
}
