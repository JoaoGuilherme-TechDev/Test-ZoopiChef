import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLoyalty } from '@/hooks/useLoyalty';
import { Users, Star, Crown, Loader2 } from 'lucide-react';

export function LoyaltyCustomers() {
  const { customers, levels, isLoading } = useLoyalty();

  const getCustomerLevel = (points: number) => {
    if (!levels || levels.length === 0) return null;
    
    const sortedLevels = [...levels].sort((a, b) => b.min_points - a.min_points);
    return sortedLevels.find(level => points >= level.min_points) || null;
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Ranking de Clientes
        </CardTitle>
        <CardDescription>
          Clientes com mais pontos acumulados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cliente com pontos ainda</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead className="text-right">Pontos Atuais</TableHead>
                <TableHead className="text-right">Total Acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.slice(0, 50).map((customer, index) => {
                const level = getCustomerLevel(customer.total_earned);
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      {index < 3 ? (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                          style={{ 
                            backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' 
                          }}
                        >
                          {index + 1}
                        </div>
                      ) : (
                        <span className="text-muted-foreground pl-2">{index + 1}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.customer?.name || 'Cliente'}</p>
                        {customer.customer?.whatsapp && (
                          <p className="text-sm text-muted-foreground">{customer.customer.whatsapp}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {level ? (
                        <Badge 
                          variant="outline"
                          style={{ 
                            borderColor: level.color, 
                            color: level.color,
                            backgroundColor: level.color + '20' 
                          }}
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          {level.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default">
                        <Star className="w-3 h-3 mr-1" />
                        {customer.current_points.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {customer.total_earned.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
