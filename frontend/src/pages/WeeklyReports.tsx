import { WeeklyComparisonReport } from '@/components/reports/WeeklyComparisonReport';
import { BarChart3 } from 'lucide-react';

export default function WeeklyReports() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
          <BarChart3 className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Relatórios Semanais</h1>
          <p className="text-muted-foreground">
            Compare o desempenho do seu negócio semana a semana
          </p>
        </div>
      </div>

      <WeeklyComparisonReport />
    </div>
  );
}
