import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCRMActivities } from '../hooks';
import { ACTIVITY_TYPE_CONFIG } from '../types';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function CRMActivitiesPage() {
  const { activities, isLoading } = useCRMActivities();

  if (isLoading) {
    return (
      <DashboardLayout title="CRM - Atividades">
        <div className="p-6">Carregando atividades...</div>
      </DashboardLayout>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce((acc, activity) => {
    const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  return (
    <DashboardLayout title="CRM - Atividades">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/crm">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Atividades</h1>
          </div>
        </div>

        {Object.keys(groupedActivities).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <Card key={date}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(date), 'EEEE, dd/MM/yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {dayActivities.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg">
                          {ACTIVITY_TYPE_CONFIG[activity.type]?.icon || '📝'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{activity.subject}</p>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(activity.created_at), 'HH:mm')}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">
                              {ACTIVITY_TYPE_CONFIG[activity.type]?.label || activity.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Nenhuma atividade registrada
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
