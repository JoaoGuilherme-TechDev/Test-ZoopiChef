import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SettingsSommelierForm } from '@/modules/sommelier/components/admin';

export default function SettingsSommelier() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Sommelier Virtual</h1>
            <p className="text-muted-foreground">
              Configure o assistente de vinhos com 40 anos de experiência
            </p>
          </div>
        </div>

        {/* Settings Form */}
        <SettingsSommelierForm />
      </div>
    </DashboardLayout>
  );
}
