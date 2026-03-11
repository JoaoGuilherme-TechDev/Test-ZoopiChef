/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Suspense, lazy, useEffect } from "react";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Contextos
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { AlertProvider } from "@/contexts/AlertContext";

// Sistema de alertas global
import { GlobalAlert } from "@/modules/alerts";
import WaiterComandasPage from "./pages/waiter/WaiterComandasPage";

// Páginas com Lazy Loading
const Auth = lazy(() => import("./pages/auth/Auth"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const KDS = lazy(() => import("./pages/orders/Kds"));
const Flavors = lazy(() => import("./pages/menu/Flavors"));
const NotFound = lazy(() => import("./pages/system/NotFound"));
const OptionsGroups = lazy(() => import("./pages/menu/OptionsGroups"));
const Tablets = lazy(() => import("./pages/orders/Tablet"));
const TablesPage = lazy(() => import("./pages/orders/TablesPage"));
const ProductsPage = lazy(() => import("./pages/menu/Products"));
const ComandasPage = lazy(() => import("./pages/orders/Comandas"));
const ChamadosPage = lazy(() => import("./pages/system/Chamados"));
const OrdersPage = lazy(() => import("./pages/orders/Orders"));
const BatchActions = lazy(() => import("./pages/system/BatchActions"));
const ProfileSettings = lazy(() => import("./pages/settings/Profile"));
const PrincipalSalaoPage = lazy(() => import("./pages/orders/PrincipalSalaoPedidos"));
const SettingsGeneralPage = lazy(() => import("./pages/settings/SettingsGeneral"));
const SettingsChannelsDevicesPage = lazy(() => import("./pages/settings/SettingsChannelsDevices"));
const SettingsSecurityAccountPage = lazy(() => import("./pages/settings/SettingsSecurityAccount"));
const SettingsCompanyProfilePage = lazy(() => import("./pages/settings/SettingsCompanyProfile"));
const SettingsBillingPaymentsPage = lazy(() => import("./pages/settings/SettingsBillingPayments"));
const SettingsPrintersKdsPage = lazy(() => import("./pages/settings/SettingsPrintersKds"));
const SettingsMenuPricingPage = lazy(() => import("./pages/settings/SettingsMenuPricing"));
const SettingsReservationsPage = lazy(() => import("./pages/settings/SettingsReservations"));
const SettingsDeliveryAreasFeesPage = lazy(() => import("./pages/settings/SettingsDeliveryAreasFees"));
const SettingsNotificationsSoundsPage = lazy(() => import("./pages/settings/SettingsNotificationsSounds"));
const SettingsIntegrationsPage = lazy(() => import("./pages/settings/SettingsIntegrations"));
const MyLinks = lazy(() => import("./pages/settings/MyLinks"));
const WaiterDashboard = lazy(() => import("./pages/waiter/WaiterDashboard"));
const WaitingListPage = lazy(() => import("./pages/waiter/WaitingListPage"));
const WaiterTablesPage = lazy(() => import("./pages/waiter/WaiterTablesPage"));
const DeliveryPage = lazy(() => import("./pages/public-delivery/DeliveryPage"));
const CustomersPage = lazy(() => import("./pages/operations/CustomersPage"));


// HUBS
const ErpHub = lazy(() => import("./pages/hubs/ErpHub"));
const FinanceHub = lazy(() => import("./pages/hubs/FinanceHub"));
const FiscalHub = lazy(() => import("./pages/hubs/FiscalHub"));
const HrHub = lazy(() => import("./pages/hubs/HrHub"));
const IntegrationsHub = lazy(() => import("./pages/hubs/IntegrationsHub"));
const LogisticsHub = lazy(() => import("./pages/hubs/LogisticsHub"));
const MarketingHub = lazy(() => import("./pages/hubs/MarketingHub"));

// OPERAÇÕES
const PrincipalComunicacaoPage = lazy(() => import("./pages/operations/PrincipalComunicacaoClientes"));
const PrincipalEntregasPage = lazy(() => import("./pages/operations/PrincipalEntregasLogistica"));
const PrincipalOperacoesPage = lazy(() => import("./pages/operations/PrincipalOperacoesEspecificas"));
const PrincipalRelatoriosPage = lazy(() => import("./pages/operations/PrincipalRelatoriosBI"));
const PrincipalVendasPage = lazy(() => import("./pages/operations/PrincipalVendasAtendimento"));

// PÁGINAS DE ADMINISTRAÇÃO SAAS
const SaaSCompanies = lazy(() => import("./pages/saas/SaaSCompaniesPage"));
const InteligenciaArtificial = lazy(() => import("./pages/system/InteligenciaArtificial"));
const TvDisplay = lazy(() => import("./pages/orders/TvDisplay"));

// Componente de Proteção de Rota
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0a14]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// CORREÇÃO: AdminGuard agora ignora maiúsculas/minúsculas
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  const role = (user?.global_role || "").toLowerCase();
  const hasAccess = role === "admin" || role === "super_admin";

  if (!hasAccess) {
    console.warn("Acesso negado: Role insuficiente", role);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, info: unknown) {
    console.error("App error boundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
          <div className="space-y-3 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm font-bold uppercase tracking-widest">
              Ocorreu um erro na interface
            </p>
            <p className="text-xs text-muted-foreground">
              Tente recarregar a página. Se persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const App = () => {
  useEffect(() => {
    const noop = () => {};
    // @ts-ignore
    toast.error = noop;
    // @ts-ignore
    toast.success = noop;
    // @ts-ignore
    toast.info = noop;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <TooltipProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <CompanyProvider>
                {/* AlertProvider envolve tudo dentro do BrowserRouter
                    para que o GlobalAlert tenha acesso ao useNavigate */}
                <AlertProvider>
                  <AppErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/auth" element={<Auth />} />

                        {/* ROTA DE GESTÃO DE EMPRESAS (PROTEGIDA) */}
                        <Route
                          path="/saas/companies"
                          element={
                            <ProtectedRoute>
                              <AdminGuard>
                                <SaaSCompanies />
                              </AdminGuard>
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/"
                          element={
                            <ProtectedRoute>
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />

                        <Route path="/principal/comunicacao-clientes/clientes" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                        <Route path="/principal/links" element={<ProtectedRoute><MyLinks /></ProtectedRoute>} />
                        <Route 
                          path="/principal/salao-pedidos" 
                          element={
                            <ProtectedRoute>
                              <PrincipalSalaoPage />
                            </ProtectedRoute>
                          } 
                        />

                        <Route path="/delivery/:slug" element={<DeliveryPage />} />

                        <Route path="/principal/comunicacao-clientes" element={<ProtectedRoute><PrincipalComunicacaoPage /></ProtectedRoute>} />
                        <Route path="/principal/entregas-logistica" element={<ProtectedRoute><PrincipalEntregasPage /></ProtectedRoute>} />
                        <Route path="/principal/operacoes-especificas" element={<ProtectedRoute><PrincipalOperacoesPage /></ProtectedRoute>} />
                        <Route path="/principal/relatorios-bi" element={<ProtectedRoute><PrincipalRelatoriosPage /></ProtectedRoute>} />
                        <Route path="/principal/vendas-atendimento" element={<ProtectedRoute><PrincipalVendasPage /></ProtectedRoute>} />

                        <Route path="/finance/hub" element={<ProtectedRoute><FinanceHub /></ProtectedRoute>} />
                        <Route path="/erp/hub" element={<ProtectedRoute><ErpHub /></ProtectedRoute>} />
                        <Route path="/fiscal/hub" element={<ProtectedRoute><FiscalHub /></ProtectedRoute>} />
                        <Route path="/hr/hub" element={<ProtectedRoute><HrHub /></ProtectedRoute>} />
                        <Route path="/integrations/hub" element={<ProtectedRoute><IntegrationsHub /></ProtectedRoute>} />
                        <Route path="/logistics/hub" element={<ProtectedRoute><LogisticsHub /></ProtectedRoute>} />
                        <Route path="/marketing/hub" element={<ProtectedRoute><MarketingHub /></ProtectedRoute>} />

                        <Route path="/inteligencia-artificial" element={<ProtectedRoute><InteligenciaArtificial /></ProtectedRoute>} />
                        <Route path="/tv-display" element={<ProtectedRoute><TvDisplay /></ProtectedRoute>} />

                        <Route path="/products/options" element={<ProtectedRoute><OptionsGroups /></ProtectedRoute>} />

                        <Route
                          path="/menu/products"
                          element={
                            <ProtectedRoute>
                              <ProductsPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/principal/salao-pedidos/comandas"
                          element={
                            <ProtectedRoute>
                              <ComandasPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/principal/salao-pedidos/Chamados"
                          element={
                            <ProtectedRoute>
                              <ChamadosPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/principal/salao-pedidos/mesas"
                          element={
                            <ProtectedRoute>
                              <TablesPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/products/flavors"
                          element={
                            <ProtectedRoute>
                              <Flavors />
                            </ProtectedRoute>
                          }
                        />

                        <Route 
                          path="/principal/salao-pedidos" 
                          element={
                            <ProtectedRoute>
                              <PrincipalSalaoPage />
                            </ProtectedRoute>
                          } 
                        />

                        <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />

                        <Route
                          path="/:slug/tablet"
                          element={
                            <ProtectedRoute>
                              <Tablets />
                            </ProtectedRoute>
                          }
                        />

                        

                        <Route
                          path="/menu/batch-actions"
                          element={
                            <ProtectedRoute>
                              <BatchActions />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/principal/salao-pedidos/kds-cozinha"
                          element={
                            <ProtectedRoute>
                              <KDS />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/principal/salao-pedidos/gestao-pedidos"
                          element={
                            <ProtectedRoute>
                              <OrdersPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/products/optional-groups"
                          element={
                            <ProtectedRoute>
                              <OptionsGroups />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/configuracoes/geral"
                          element={
                            <ProtectedRoute>
                              <SettingsGeneralPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/configuracoes/geral/cardapio-precos"
                          element={
                            <ProtectedRoute>
                              <SettingsMenuPricingPage />
                            </ProtectedRoute>
                          }
                        />

                      

                        <Route
                          path="configuracoes/geral/faturamento-pagamentos"
                          element={
                            <ProtectedRoute>
                              <SettingsBillingPaymentsPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/configuracoes/geral/empresa"
                          element={
                            <ProtectedRoute>
                              <SettingsCompanyProfilePage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/configuracoes/geral/reservas"
                          element={
                            <ProtectedRoute>
                              <SettingsReservationsPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/configuracoes/seguranca-conta"
                          element={
                            <ProtectedRoute>
                              <SettingsSecurityAccountPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/configuracoes/canais-dispositivos"
                          element={
                            <ProtectedRoute>
                              <SettingsChannelsDevicesPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route path="/waiter" element={<ProtectedRoute><WaiterDashboard /></ProtectedRoute>} />

                        <Route path="/waiter/waiting-list" element={<ProtectedRoute><WaitingListPage /></ProtectedRoute>} />

                        <Route path="/waiter/tables" element={<ProtectedRoute><WaiterTablesPage /></ProtectedRoute>} />

                        <Route path="/waiter/comandas" element={<ProtectedRoute><WaiterComandasPage /></ProtectedRoute>} />

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>

                    {/* GlobalAlert montado uma única vez fora das <Routes>,
                        dentro do AlertProvider e do BrowserRouter */}
                    <GlobalAlert />
                  </AppErrorBoundary>
                </AlertProvider>
              </CompanyProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;