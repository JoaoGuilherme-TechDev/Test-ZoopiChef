import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { VirtualCardViewer } from '@/components/loyalty/VirtualCardViewer';
import { ArrowLeft, CreditCard } from 'lucide-react';

export default function VirtualCardPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Cartão Virtual de Fidelidade
          </h1>
          <p className="text-muted-foreground">
            Visualize e envie cartões de fidelidade virtuais via WhatsApp
          </p>
        </div>
      </div>

      <VirtualCardViewer />
    </div>
  );
}
