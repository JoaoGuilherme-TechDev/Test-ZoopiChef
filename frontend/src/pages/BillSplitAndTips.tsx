import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TipsManagement } from '@/components/billing/TipsManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, HandCoins } from 'lucide-react';

export default function BillSplitAndTips() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
          <HandCoins className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Divisão de Contas & Gorjetas</h1>
          <p className="text-muted-foreground">
            Gerencie divisões de conta e distribuição de gorjetas
          </p>
        </div>
      </div>

      <Tabs defaultValue="tips" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tips" className="gap-2">
            <HandCoins className="w-4 h-4" />
            Gorjetas
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <Users className="w-4 h-4" />
            Sobre Divisão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tips">
          <TipsManagement />
        </TabsContent>

        <TabsContent value="info">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Divisão de Contas
              </CardTitle>
              <CardDescription>
                Como funciona a divisão de contas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-medium mb-2">Divisão Igual</h4>
                  <p className="text-sm text-muted-foreground">
                    O valor total é dividido igualmente entre todos os participantes. 
                    Ideal para grupos que compartilharam todos os itens.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <h4 className="font-medium mb-2">Por Item</h4>
                  <p className="text-sm text-muted-foreground">
                    Cada pessoa paga pelos itens que consumiu individualmente. 
                    Perfeito para quando cada um pediu algo diferente.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <h4 className="font-medium mb-2">Valor Personalizado</h4>
                  <p className="text-sm text-muted-foreground">
                    Defina manualmente quanto cada pessoa irá pagar. 
                    Útil para situações especiais ou acordos entre o grupo.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">💡 Dica</h4>
                <p className="text-sm text-muted-foreground">
                  A divisão de contas pode ser acessada diretamente do terminal do operador, 
                  na tela de fechamento de pedido ou comanda. Basta clicar no botão "Dividir Conta".
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
