import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { SHORTCUT_LABELS } from '@/hooks/usePDVKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts?: Partial<typeof SHORTCUT_LABELS>;
}

export function KeyboardShortcutsHelp({ 
  shortcuts = SHORTCUT_LABELS 
}: KeyboardShortcutsHelpProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Atalhos</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          {Object.entries(shortcuts).map(([key, label]) => (
            <div 
              key={key}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted transition-colors"
            >
              <span className="text-sm">{label}</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border shadow-sm">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground mt-4">
          Pressione a tecla correspondente para executar a ação.
          Atalhos funcionam mesmo com campos de texto focados.
        </div>
      </DialogContent>
    </Dialog>
  );
}
