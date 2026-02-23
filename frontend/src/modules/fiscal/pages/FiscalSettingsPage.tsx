import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Package, ArrowLeftRight, Scale, TrendingUp, Shield, Hash, RefreshCw, Ban, Mail, BarChart3, Store } from 'lucide-react';
import { TaxRegimeConfig } from '../components/TaxRegimeConfig';
import { NCMCodeSearch } from '../components/NCMCodeSearch';
import { CFOPCodeManager } from '../components/CFOPCodeManager';
import { FiscalRulesManager } from '../components/FiscalRulesManager';
import { IBSCBSRulesPanel } from '../components/IBSCBSRulesPanel';
import { CertificateConfig } from '../components/CertificateConfig';
import { FiscalNumerationConfig } from '../components/FiscalNumerationConfig';
import { FiscalRetryManager } from '../components/FiscalRetryManager';
import { FiscalVoidNumbers } from '../components/FiscalVoidNumbers';
import { FiscalAccountantConfig } from '../components/FiscalAccountantConfig';
import { FiscalSalesReport } from '../components/FiscalSalesReport';
import { CompanyBranchManager } from '../components/CompanyBranchManager';

export function FiscalSettingsPage() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'branches');

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  return (
    <DashboardLayout title="Configurações Fiscais">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações Fiscais</h1>
          <p className="text-muted-foreground">
            Gerencie o regime tributário, códigos fiscais, regras de impostos e envio para contabilidade
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="branches" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">CNPJs</span>
            </TabsTrigger>
            <TabsTrigger value="certificate" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Certificado</span>
            </TabsTrigger>
            <TabsTrigger value="numeration" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              <span className="hidden sm:inline">Numeração</span>
            </TabsTrigger>
            <TabsTrigger value="pdv-retry" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">PDV/Retry</span>
            </TabsTrigger>
            <TabsTrigger value="void" className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              <span className="hidden sm:inline">Inutilização</span>
            </TabsTrigger>
            <TabsTrigger value="accountant" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Contador</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </TabsTrigger>
            <TabsTrigger value="regime" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Regime</span>
            </TabsTrigger>
            <TabsTrigger value="ncm" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">NCM</span>
            </TabsTrigger>
            <TabsTrigger value="cfop" className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">CFOP</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Regras</span>
            </TabsTrigger>
            <TabsTrigger value="ibs-cbs" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">IBS/CBS</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branches">
            <CompanyBranchManager />
          </TabsContent>

          <TabsContent value="certificate">
            <CertificateConfig />
          </TabsContent>

          <TabsContent value="numeration">
            <FiscalNumerationConfig />
          </TabsContent>

          <TabsContent value="pdv-retry">
            <FiscalRetryManager />
          </TabsContent>

          <TabsContent value="void">
            <FiscalVoidNumbers />
          </TabsContent>

          <TabsContent value="accountant">
            <FiscalAccountantConfig />
          </TabsContent>

          <TabsContent value="reports">
            <FiscalSalesReport />
          </TabsContent>

          <TabsContent value="regime">
            <TaxRegimeConfig />
          </TabsContent>

          <TabsContent value="ncm">
            <NCMCodeSearch />
          </TabsContent>

          <TabsContent value="cfop">
            <CFOPCodeManager />
          </TabsContent>

          <TabsContent value="rules">
            <FiscalRulesManager />
          </TabsContent>

          <TabsContent value="ibs-cbs">
            <IBSCBSRulesPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
