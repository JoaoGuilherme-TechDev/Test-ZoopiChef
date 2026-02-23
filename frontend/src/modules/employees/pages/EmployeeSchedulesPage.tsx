import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEmployeeSchedules } from '../hooks/useEmployeeSchedules';
import { useEmployees } from '../hooks/useEmployees';
import { DAY_LABELS } from '../types';
import { 
  Calendar, 
  Plus, 
  Clock,
  Users
} from 'lucide-react';

export function EmployeeSchedulesPage() {
  const { schedules, isLoading } = useEmployeeSchedules();
  const { employees } = useEmployees();

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Funcionário';
  };

  const schedulesByEmployee = schedules.reduce((acc, schedule) => {
    const empId = schedule.employee_id;
    if (!acc[empId]) acc[empId] = [];
    acc[empId].push(schedule);
    return acc;
  }, {} as Record<string, typeof schedules>);

  if (isLoading) {
    return (
      <DashboardLayout title="Escalas">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Escalas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Escalas de Trabalho</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Escala
          </Button>
        </div>

        {/* Schedule Grid */}
        <div className="grid gap-4 md:grid-cols-7">
          {DAY_LABELS.map((day, index) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-center">{day}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {schedules
                  .filter(s => s.day_of_week === index && s.is_active)
                  .map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-2 bg-primary/10 rounded text-xs space-y-1"
                    >
                      <div className="font-medium truncate">
                        {getEmployeeName(schedule.employee_id)}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                      </div>
                    </div>
                  ))}
                {schedules.filter(s => s.day_of_week === index && s.is_active).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    Sem escalas
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Employees Schedule Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Escalas por Funcionário
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(schedulesByEmployee).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma escala cadastrada
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(schedulesByEmployee).map(([empId, empSchedules]) => (
                  <div key={empId} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">{getEmployeeName(empId)}</h4>
                    <div className="flex flex-wrap gap-2">
                      {empSchedules
                        .filter(s => s.is_active)
                        .sort((a, b) => a.day_of_week - b.day_of_week)
                        .map((schedule) => (
                          <Badge key={schedule.id} variant="outline">
                            {DAY_LABELS[schedule.day_of_week]}: {schedule.start_time.slice(0, 5)}-{schedule.end_time.slice(0, 5)}
                          </Badge>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
