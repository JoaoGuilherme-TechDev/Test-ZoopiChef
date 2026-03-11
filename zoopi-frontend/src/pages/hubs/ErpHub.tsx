import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ErpHubPage() {
  return (
    <DashboardLayout title="Hub ERP & Estoque">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Hub ERP & Estoque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Esta página será o hub para gestão avançada de estoque e ERP:
              itens, fornecedores, compras, fichas técnicas e CMV.
            </p>
            <p>
              Aqui você vai acompanhar movimentações, inventário, precificação e
              lucratividade dos produtos com visão integrada ao cardápio.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

