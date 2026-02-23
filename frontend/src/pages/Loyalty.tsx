import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoyaltyStats } from '@/components/loyalty/LoyaltyStats';
import { LoyaltyConfig } from '@/components/loyalty/LoyaltyConfig';
import { LoyaltyLevels } from '@/components/loyalty/LoyaltyLevels';
import { LoyaltyRewards } from '@/components/loyalty/LoyaltyRewards';
import { LoyaltyCustomers } from '@/components/loyalty/LoyaltyCustomers';
import { LoyaltyProductPoints } from '@/components/loyalty/LoyaltyProductPoints';
import { LoyaltyReceiptTypePoints } from '@/components/loyalty/LoyaltyReceiptTypePoints';
import { LoyaltyPaymentMethodPoints } from '@/components/loyalty/LoyaltyPaymentMethodPoints';
import { LoyaltyRedemptions } from '@/components/loyalty/LoyaltyRedemptions';
import { Settings, Crown, Gift, Users, Package, Truck, History, CreditCard } from 'lucide-react';

export default function Loyalty() {
  return (
    <DashboardLayout title="Programa de Fidelidade">
      <div className="space-y-6">
        {/* Stats */}
        <LoyaltyStats />

        {/* Tabs */}
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
            <TabsTrigger value="levels" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Níveis</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">Prêmios</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="frete" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Tipo Pedido</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pagamento</span>
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Resgates</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <LoyaltyConfig />
          </TabsContent>

          <TabsContent value="levels">
            <LoyaltyLevels />
          </TabsContent>

          <TabsContent value="rewards">
            <LoyaltyRewards />
          </TabsContent>

          <TabsContent value="customers">
            <LoyaltyCustomers />
          </TabsContent>

          <TabsContent value="products">
            <LoyaltyProductPoints />
          </TabsContent>

          <TabsContent value="frete">
            <LoyaltyReceiptTypePoints />
          </TabsContent>

          <TabsContent value="payment">
            <LoyaltyPaymentMethodPoints />
          </TabsContent>

          <TabsContent value="redemptions">
            <LoyaltyRedemptions />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
