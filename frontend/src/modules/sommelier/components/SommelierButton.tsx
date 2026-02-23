import { Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { SommelierFlow } from './SommelierFlow';

interface SommelierButtonProps {
  companyId: string;
  companyName: string;
  logoUrl?: string | null;
  onAddToCart?: (items: { productId: string; quantity: number }[]) => void;
}

export function SommelierButton({
  companyId,
  companyName,
  logoUrl,
  onAddToCart,
}: SommelierButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="group relative overflow-hidden border-purple-500/30 bg-gradient-to-r from-purple-950/50 to-amber-950/50 hover:from-purple-900/50 hover:to-amber-900/50 hover:border-purple-400/50 transition-all"
      >
        <Wine className="w-4 h-4 mr-2 text-purple-400 group-hover:text-purple-300" />
        <span className="text-white">Sommelier Virtual</span>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg h-[90vh] p-0 overflow-hidden bg-background border-purple-500/30">
          <SommelierFlow
            companyId={companyId}
            companyName={companyName}
            logoUrl={logoUrl}
            onAddToCart={onAddToCart}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
