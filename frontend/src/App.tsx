// Toast UIs desativados a pedido do usuário (evitar “balões”/avisos na tela)
// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { toast as sonnerToast } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { CompanyAccessGuard } from "@/components/guards/CompanyAccessGuard";
import { InternalMessagePrintListener } from "@/components/orders/InternalMessagePrintListener";
import { KitchenPrintListener } from "@/components/orders/KitchenPrintListener";
import { ProactiveAgentProvider } from "@/components/proactive-agent/ProactiveAgentProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { PWAInstallPrompt } from "@/components/pwa";
import { PWAManifestInitializer } from "@/components/pwa/PWAManifestInitializer";
import { KioskContextRestorer } from "@/components/pwa/KioskContextRestorer";
import { TabletContextRestorer } from "@/components/pwa/TabletContextRestorer";
import { EntregadorContextRestorer } from "@/components/pwa/EntregadorContextRestorer";

import { useEffect, lazy, Suspense } from "react";
import { initErrorMonitoring } from "@/lib/errorMonitoring";

// =============================================================================
// CORE PAGES - Carregadas imediatamente (mais usadas)
// =============================================================================
import RootEntry from "./pages/RootEntry";
import Auth from "./pages/Auth";
import Orders from "./pages/Orders";
import KDS from "./pages/KDS";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Blocked from "./pages/Blocked";

// =============================================================================
// LAZY LOADED PAGES - Carregadas sob demanda
// =============================================================================

// Company & Basic
const Company = lazy(() => import("./pages/Company"));
const Combos = lazy(() => import("./pages/Combos"));
const RodizioConfig = lazy(() => import("./pages/RodizioConfig"));
const RodizioConsumptionReport = lazy(() => import("./pages/RodizioConsumptionReport"));
const Subcategories = lazy(() => import("./pages/Subcategories"));
const Users = lazy(() => import("./pages/Users"));
const Marketing = lazy(() => import("./pages/Marketing"));
const DeliveryMenu = lazy(() => import("./pages/DeliveryMenu"));
const Deliverers = lazy(() => import("./pages/Deliverers"));
const DelivererTracking = lazy(() => import("./pages/DelivererTracking"));
const DelivererSettlement = lazy(() => import("./pages/DelivererSettlement"));
const Banners = lazy(() => import("./pages/Banners"));
const TVMenuPublic = lazy(() => import("./pages/TVMenuPublic"));
const Prizes = lazy(() => import("./pages/Prizes"));
const PrizeWheel = lazy(() => import("./pages/PrizeWheel"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const MyLinks = lazy(() => import("./pages/MyLinks"));
const Promotions = lazy(() => import("./pages/Promotions"));
const TVScreens = lazy(() => import("./pages/TVScreens"));
const QA = lazy(() => import("./pages/QA"));
const DebugErrors = lazy(() => import("./pages/DebugErrors"));
const Repurchase = lazy(() => import("./pages/Repurchase"));
const TimeHighlights = lazy(() => import("./pages/TimeHighlights"));
const Profiles = lazy(() => import("./pages/Profiles"));
const DocumentacaoDownload = lazy(() => import("./pages/DocumentacaoDownload"));
const AuditoriaRelatorio = lazy(() => import("./pages/AuditoriaRelatorio"));
const Bloco1Relatorio = lazy(() => import("./pages/Bloco1Relatorio"));
const Bloco2Relatorio = lazy(() => import("./pages/Bloco2Relatorio"));
const Bloco3Relatorio = lazy(() => import("./pages/Bloco3Relatorio"));
const Bloco4Relatorio = lazy(() => import("./pages/Bloco4Relatorio"));
const Bloco5Relatorio = lazy(() => import("./pages/Bloco5Relatorio"));
const Bloco6Relatorio = lazy(() => import("./pages/Bloco6Relatorio"));
const Bloco7Relatorio = lazy(() => import("./pages/Bloco7Relatorio"));
const Bloco8Relatorio = lazy(() => import("./pages/Bloco8Relatorio"));
const Bloco9Relatorio = lazy(() => import("./pages/Bloco9Relatorio"));
const AuditoriaFinal = lazy(() => import("./pages/AuditoriaFinal"));
const AICentral = lazy(() => import("./pages/AICentral"));
const AIRecommendations = lazy(() => import("./pages/AIRecommendations"));
const AISuggestions = lazy(() => import("./pages/AISuggestions"));
const AIMenuCreative = lazy(() => import("./pages/AIMenuCreative"));
const AITVScheduler = lazy(() => import("./pages/AITVScheduler"));
const AIOperational = lazy(() => import("./pages/AIOperational"));
const AIMarketingPosts = lazy(() => import("./pages/AIMarketingPosts"));
const AIProductImport = lazy(() => import("./pages/AIProductImport"));

// AI Advanced Modules - International Features
const VoiceAISettings = lazy(() => import("./pages/VoiceAISettings"));
const SmartWaitlistPage = lazy(() => import("./pages/SmartWaitlistPage"));
const WaitlistPage = lazy(() => import("./pages/WaitlistPage"));
const AIConciergeSettings = lazy(() => import("./pages/AIConciergeSettings"));
const PredictiveUpsellingSettings = lazy(() => import("./pages/PredictiveUpsellingSettings"));
const StaffPerformancePage = lazy(() => import("./pages/StaffPerformancePage"));
const AIBehaviorAnalysisPage = lazy(() => import("./pages/AIBehaviorAnalysisPage"));

// New Modules
const WeatherMenuPage = lazy(() => import("./pages/WeatherMenuPage"));
const VirtualCardPage = lazy(() => import("./pages/VirtualCardPage"));

// Settings pages
const SettingsBranding = lazy(() => import("./pages/settings/SettingsBranding"));
const SettingsSommelier = lazy(() => import("./pages/settings/SettingsSommelier"));
const SettingsIntegrations = lazy(() => import("./pages/settings/SettingsIntegrations"));
const IntegrationHub = lazy(() => import("./pages/settings/IntegrationHub"));
const SettingsAI = lazy(() => import("./pages/settings/SettingsAI"));
const SettingsLayout = lazy(() => import("./pages/settings/SettingsLayout"));
const SettingsPrinting = lazy(() => import("./pages/settings/SettingsPrinting"));
const SettingsOnlineMenu = lazy(() => import("./pages/settings/SettingsOnlineMenu"));
const SettingsOnlineStore = lazy(() => import("./pages/settings/SettingsOnlineStore"));
const SettingsDelivery = lazy(() => import("./pages/settings/SettingsDelivery"));
const DeliverySimulator = lazy(() => import("./pages/settings/DeliverySimulator"));
const SettingsKDS = lazy(() => import("./pages/settings/SettingsKDS"));
const KDSSettingsPage = lazy(() => import("./pages/KDSSettings"));
const SettingsTimers = lazy(() => import("./pages/settings/SettingsTimers"));
const SettingsWheel = lazy(() => import("./pages/settings/SettingsWheel"));
const SettingsPanic = lazy(() => import("./pages/settings/SettingsPanic"));
const SettingsCustomers = lazy(() => import("./pages/settings/SettingsCustomers"));
const SettingsCash = lazy(() => import("./pages/settings/SettingsCash"));
const SettingsOrders = lazy(() => import("./pages/settings/SettingsOrders"));
const SettingsSounds = lazy(() => import("./pages/settings/SettingsSounds"));
const SettingsTable = lazy(() => import("./pages/settings/SettingsTable"));
const SettingsScale = lazy(() => import("./pages/settings/SettingsScale"));
const KitchenTicketEditor = lazy(() => import("./pages/admin/KitchenTicketEditor"));
const SettingsDelivererTracking = lazy(() => import("./pages/settings/SettingsDelivererTracking"));
const SettingsSmartPOS = lazy(() => import("./pages/settings/SettingsSmartPOS"));
const SettingsPizza = lazy(() => import("./pages/settings/SettingsPizza"));
const SettingsTables = lazy(() => import("./pages/settings/SettingsTables"));
const SettingsReservations = lazy(() => import("./pages/settings/SettingsReservations"));
const SettingsTabletAutoatendimento = lazy(() => import("./pages/settings/SettingsTabletAutoatendimento"));
const SettingsTVDisplay = lazy(() => import("./pages/settings/SettingsTVDisplay"));
const SettingsKiosk = lazy(() => import("./pages/settings/SettingsKiosk"));
const SettingsOperatorPermissions = lazy(() => import("./pages/settings/SettingsOperatorPermissions"));
const SettingsProactiveAgent = lazy(() => import("./pages/settings/SettingsProactiveAgent"));
const SettingsWaiterPIN = lazy(() => import("./pages/settings/SettingsWaiterPIN"));
const SettingsWaiters = lazy(() => import("./pages/settings/SettingsWaiters"));

// Public pages
const PublicMenuByToken = lazy(() => import("./pages/PublicMenuByToken"));
const PublicTVByToken = lazy(() => import("./pages/PublicTVByToken"));
const PublicRoletaByToken = lazy(() => import("./pages/PublicRoletaByToken"));
const PublicKDSByToken = lazy(() => import("./pages/PublicKDSByToken"));
const PublicCallPanel = lazy(() => import("./pages/PublicCallPanel"));
const PublicSelfServiceByToken = lazy(() => import("./pages/PublicSelfServiceByToken"));
const PublicMenuBySlug = lazy(() => import("./pages/PublicMenuBySlug"));
const PublicQRMesa = lazy(() => import("./pages/PublicQRMesa"));
const PublicQRComanda = lazy(() => import("./pages/PublicQRComanda"));
const PublicReservationBySlug = lazy(() => import("./pages/PublicReservationBySlug"));
const PublicReservationPortal = lazy(() => import("./pages/PublicReservationPortal"));
const PublicOptOut = lazy(() => import("./pages/PublicOptOut"));
const PublicReviewByToken = lazy(() => import("./pages/PublicReviewByToken"));
const KioskPublic = lazy(() => import("./pages/KioskPublic"));
const ScaleTerminal = lazy(() => import("./pages/ScaleTerminal"));
const PublicRotisseurPage = lazy(() => import("./pages/PublicRotisseurPage"));
const PublicOrderTracker = lazy(() => import("./pages/PublicOrderTracker"));
const PublicDeliveryTracker = lazy(() => import("./pages/PublicDeliveryTracker"));
const PublicGpsMap = lazy(() => import("./pages/PublicGpsMap"));
const QueueTrackerPage = lazy(() => import("./pages/public/QueueTrackerPage"));
const KDSWaitlistPage = lazy(() => import("./pages/public/KDSWaitlistPage"));
const TicketRedeem = lazy(() => import("./pages/TicketRedeem"));

// Unified PWA Pages (new /:slug/:function pattern)
const TenantTotemPWA = lazy(() => import("./pages/pwa/TenantTotemPWA"));
const TenantTabletPWA = lazy(() => import("./pages/pwa/TenantTabletPWA"));
const TenantEntregadorPWA = lazy(() => import("./pages/pwa/TenantEntregadorPWA"));
const TenantEntregadorAppPWA = lazy(() => import("./pages/pwa/TenantEntregadorAppPWA"));
const TenantGarcomPWA = lazy(() => import("./pages/pwa/TenantGarcomPWA"));
const TenantGarcomAppPWA = lazy(() => import("./pages/pwa/TenantGarcomAppPWA"));
const PWAWaiterWaitlistScreen = lazy(() => import("./pages/pwa/PWAWaiterWaitlistScreen"));
const PWAWaiterTablesScreen = lazy(() => import("./pages/pwa/PWAWaiterTablesScreen"));
const PWAWaiterTableDetailScreen = lazy(() => import("./pages/pwa/PWAWaiterTableDetailScreen"));
const PWAWaiterComandasScreen = lazy(() => import("./pages/pwa/PWAWaiterComandasScreen"));
const PWAWaiterComandaDetailScreen = lazy(() => import("./pages/pwa/PWAWaiterComandaDetailScreen"));
const WaiterPWALayout = lazy(() => import("./layouts/WaiterPWALayout"));
const TenantPDVPWA = lazy(() => import("./pages/pwa/TenantPDVPWA"));
const TenantTerminalPWA = lazy(() => import("./pages/pwa/TenantTerminalPWA"));
const PWAEntryPage = lazy(() => import("./pages/pwa/PWAEntryPage"));
const ScheduledOrdersPWA = lazy(() => import("./pages/pwa/ScheduledOrdersPWA"));
const UniversalAccessPage = lazy(() => import("./pages/access/UniversalAccessPage"));

// Admin pages
const ReceiptLayoutEditor = lazy(() => import("./pages/admin/ReceiptLayoutEditor"));

// SaaS Admin pages
const SaasDashboard = lazy(() => import("./pages/saas/SaasDashboard"));
const SaasCompanies = lazy(() => import("./pages/saas/SaasCompanies"));
const SaasCompanyDetails = lazy(() => import("./pages/saas/SaasCompanyDetails"));
const SaasPlans = lazy(() => import("./pages/saas/SaasPlans"));
const SaasSubscriptions = lazy(() => import("./pages/saas/SaasSubscriptions"));
const SaasTemplates = lazy(() => import("./pages/saas/SaasTemplates"));
const SaasAudit = lazy(() => import("./pages/saas/SaasAudit"));
const SaasUsers = lazy(() => import("./pages/saas/SaasUsers"));
const SaasLicenses = lazy(() => import("./pages/saas/SaasLicenses"));
const SaasBackupRestore = lazy(() => import("./pages/saas/SaasBackupRestore"));
const ResellerManagement = lazy(() => import("./pages/saas/ResellerManagement"));
const ResellerDashboard = lazy(() => import("./pages/reseller/ResellerDashboard"));
const ResellerBranding = lazy(() => import("./pages/reseller/ResellerBranding"));

// Other pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const PhoneOrder = lazy(() => import("./pages/PhoneOrder"));
const DelayReports = lazy(() => import("./pages/reports/DelayReports"));
const FiadoReports = lazy(() => import("./pages/reports/FiadoReports"));
const SalesByPeriodReport = lazy(() => import("./pages/reports/SalesByPeriodReport"));
const Reports = lazy(() => import("./pages/Reports"));

// Reports Hub Module - Lazy loaded
const ReportsHubPage = lazy(() => import("./modules/reports/pages/ReportsHubPage"));
const SalesReportsPage = lazy(() => import("./modules/reports/pages/SalesReportsPage"));
const StockReportsPage = lazy(() => import("./modules/reports/pages/StockReportsPage"));

// Sales Projection Module
const SalesProjectionPage = lazy(() => import("./modules/sales-projection/pages/SalesProjectionPage"));
const SystemManual = lazy(() => import("./pages/SystemManual"));
const BusinessIntelligence = lazy(() => import("./pages/BusinessIntelligence"));
const BIAdvanced = lazy(() => import("./pages/BIAdvanced"));
const Loyalty = lazy(() => import("./pages/Loyalty"));
const LoyaltyCustomerPortal = lazy(() => import("./pages/LoyaltyCustomerPortal"));
const SettingsTEF = lazy(() => import("./pages/settings/SettingsTEF"));
const SettingsUnits = lazy(() => import("./pages/settings/SettingsUnits"));
const DelivererApp = lazy(() => import("./pages/DelivererApp"));
const ChatMonitor = lazy(() => import("./pages/ChatMonitor"));
const CashRegister = lazy(() => import("./pages/CashRegister"));
const AccountsPayable = lazy(() => import("./pages/AccountsPayable"));
const CustomerCredits = lazy(() => import("./pages/CustomerCredits"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const ChartOfAccounts = lazy(() => import("./pages/ChartOfAccounts"));
const CashHistory = lazy(() => import("./pages/CashHistory"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const BankAccounts = lazy(() => import("./pages/BankAccounts"));
const Flavors = lazy(() => import("./pages/Flavors"));
const ImportExport = lazy(() => import("./pages/ImportExport"));
const FlavorHighlightGroups = lazy(() => import("./pages/FlavorHighlightGroups"));
const BatchActions = lazy(() => import("./pages/BatchActions"));
const OptionalGroups = lazy(() => import("./pages/OptionalGroups"));
const TimerDashboard = lazy(() => import("./pages/TimerDashboard"));
const DelivererRankings = lazy(() => import("./pages/DelivererRankings"));
const Reviews = lazy(() => import("./pages/Reviews"));
const PerformancePanel = lazy(() => import("./pages/PerformancePanel"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Coupons = lazy(() => import("./pages/Coupons"));
const DemandForecast = lazy(() => import("./pages/DemandForecast"));
const ChurnPrediction = lazy(() => import("./pages/ChurnPrediction"));
const ReferralProgram = lazy(() => import("./pages/ReferralProgram"));
const Gamification = lazy(() => import("./pages/Gamification"));
const DynamicPricing = lazy(() => import("./pages/DynamicPricing"));
const SmartKDSSettings = lazy(() => import("./pages/SmartKDSSettings"));
const PizzaKDSSettingsPage = lazy(() => import("./pages/settings/PizzaKDSSettingsPage"));
const PizzaKDSApp = lazy(() => import("./pages/pwa/PizzaKDSApp"));
const PizzaKdsV2App = lazy(() => import("./pages/pwa/PizzaKdsV2App"));
const SelfserviceAdvancedSettings = lazy(() => import("./pages/SelfserviceAdvancedSettings"));
const ChatbotSettings = lazy(() => import("./pages/ChatbotSettings"));
const Tables = lazy(() => import("./pages/Tables"));
const TablesRegister = lazy(() => import("./pages/TablesRegister"));
const Comandas = lazy(() => import("./pages/Comandas"));
const ComandaDetail = lazy(() => import("./pages/ComandaDetail"));
const SelfService = lazy(() => import("./pages/SelfService"));
const PDVLoja = lazy(() => import("./pages/PDVLoja"));
const InternalMessages = lazy(() => import("./pages/InternalMessages"));
const Reservations = lazy(() => import("./pages/Reservations"));
const AdvancedMenu = lazy(() => import("./pages/AdvancedMenu"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const BankReconciliation = lazy(() => import("./pages/BankReconciliation"));
const TabletAutoatendimento = lazy(() => import("./pages/TabletAutoatendimento"));
const TabletKiosk = lazy(() => import("./pages/TabletKiosk"));
const ServiceCallsMonitor = lazy(() => import("./pages/ServiceCallsMonitor"));
const PrintStation = lazy(() => import("./pages/PrintStation"));
const OperatorTerminal = lazy(() => import("./pages/OperatorTerminal"));
const Demo = lazy(() => import("./pages/Demo"));
const ROICalculator = lazy(() => import("./pages/ROICalculator"));
const SmartPOSSimulator = lazy(() => import("./pages/SmartPOSSimulator"));

// Back-compat public routes
const RoletaSlugRedirect = lazy(() => import("./pages/RoletaSlugRedirect"));
const ReservaSlugRedirect = lazy(() => import("./pages/ReservaSlugRedirect"));

// Comanda Validator Module
const ComandaValidatorPublic = lazy(() => import("./pages/ComandaValidatorPublic"));
const ComandaValidatorSettings = lazy(() => import("./pages/ComandaValidatorSettings"));

// New Modules - Self-checkout, Expedition, Performance, Tax AI
const SelfCheckout = lazy(() => import("./pages/SelfCheckout"));
const DeliveryExpedition = lazy(() => import("./pages/DeliveryExpedition"));
const DelivererBadge = lazy(() => import("./pages/DelivererBadge"));
const OperationsPerformance = lazy(() => import("./pages/OperationsPerformance"));
const TaxAIAdvisor = lazy(() => import("./pages/TaxAIAdvisor"));
const FiservSettings = lazy(() => import("./pages/FiservSettings"));

// New Feature Modules - Bill Split, Tips, Scheduling, Reports
const BillSplitAndTips = lazy(() => import("./pages/BillSplitAndTips"));
const ScheduledOrders = lazy(() => import("./pages/ScheduledOrders"));
const ScheduledOrdersReport = lazy(() => import("./pages/ScheduledOrdersReport"));
const WeeklyReports = lazy(() => import("./pages/WeeklyReports"));
const SettingsFooter = lazy(() => import("./pages/settings/SettingsFooter"));

// Unified Scheduling Module
const SchedulingModule = lazy(() => import("./pages/scheduling/SchedulingModule"));
const ScheduledOrdersTab = lazy(() => import("./pages/scheduling/ScheduledOrdersTab"));
const ProductionTab = lazy(() => import("./pages/scheduling/ProductionTab"));
const ReportsTab = lazy(() => import("./pages/scheduling/ReportsTab"));

// Waiter PWA Pages
const WaiterHome = lazy(() => import("./pages/waiter/WaiterHome"));
const WaiterTablesMap = lazy(() => import("./pages/waiter/WaiterTablesMap"));
const WaiterComandasMap = lazy(() => import("./pages/waiter/WaiterComandasMap"));
const WaiterTableDetail = lazy(() => import("./pages/waiter/WaiterTableDetail"));
const WaiterComandaDetail = lazy(() => import("./pages/waiter/WaiterComandaDetail"));
// PWAWaiterTablesScreen and PWAWaiterComandasScreen are imported above in "Unified PWA Pages" section
const WaiterAppLayout = lazy(() => import("./components/waiter/WaiterAppLayout").then(m => ({ default: m.WaiterAppLayout })));

// Entregador PWA Pages (Isolated - PIN-based auth)
const EntregadorIndex = lazy(() => import("./pages/entregador/EntregadorIndex"));
const EntregadorLogin = lazy(() => import("./pages/entregador/EntregadorLogin"));
const EntregadorApp = lazy(() => import("./pages/entregador/EntregadorApp"));
const EntregadorLayout = lazy(() => import("./pages/entregador/EntregadorLayout").then(m => ({ default: m.EntregadorLayout })));

// ERP Financeiro Pages (named exports - keep original imports)
import {
  ERPDashboardPage,
  ERPSalesReportPage,
  ERPTopProductsPage,
  ERPDiscountsPage,
  ERPDeliveryFeesPage,
  ERPReceivablesPage,
  ERPPayablesPage,
  ERPCostCentersPage,
  ERPProductCostsPage,
  ERPDREPage,
  ERPDREAdvancedPage,
  ERPCMVPage,
  ERPCashFlowPage,
  ERPExecutivePage,
  ERPBudgetsPage,
  ERPAlertsPage,
} from "./modules/finance-erp/pages";

// CRM Pages (named exports)
import {
  CRMDashboardPage,
  CRMLeadsPage,
  CRMCustomersPage,
  CRMActivitiesPage,
} from "./modules/crm/pages";
import { CRMAutomationsPage } from "./modules/crm/pages/CRMAutomationsPage";
import { CRMPipelinePage } from "./modules/crm/pages/CRMPipelinePage";

// Integrations Pages (named exports)
import {
  IntegrationsDashboardPage,
  WhatsAppCenterPage,
  PaymentCenterPage,
} from "./modules/integrations/pages";

// Marketing Module Pages (named exports)
import {
  MarketingDashboardPage,
  MarketingCampaignsPage,
  MarketingAutomationsPage,
} from "./modules/marketing/pages";

// ERP Inventory Pages - Lazy loaded (default exports)
const ERPStockDashboardPage = lazy(() => import("./modules/erp-inventory/pages/ERPStockDashboardPage"));
const ERPItemsPage = lazy(() => import("./modules/erp-inventory/pages/ERPItemsPage"));
const ERPSuppliersPage = lazy(() => import("./modules/erp-inventory/pages/ERPSuppliersPage"));
const ERPPurchasesPage = lazy(() => import("./modules/erp-inventory/pages/ERPPurchasesPage"));
const ERPRecipesPage = lazy(() => import("./modules/erp-inventory/pages/ERPRecipesPage"));
const ERPStockPage = lazy(() => import("./modules/erp-inventory/pages/ERPStockPage"));
const ERPMovementsPage = lazy(() => import("./modules/erp-inventory/pages/ERPMovementsPage"));
const ERPInventoryCountPage = lazy(() => import("./modules/erp-inventory/pages/ERPInventoryCountPage"));
const ERPCMVAnalysisPage = lazy(() => import("./modules/erp-inventory/pages/ERPCMVAnalysisPage"));
const ERPPricingPage = lazy(() => import("./modules/erp-inventory/pages/ERPPricingPage"));
const ERPProfitPage = lazy(() => import("./modules/erp-inventory/pages/ERPProfitPage"));

// New Modules (named exports)
import { EmployeesPage, EmployeeSchedulesPage, EmployeeCommissionsPage } from "./modules/employees/pages";
import { AssetsPage, AssetMaintenancePage } from "./modules/assets/pages";
import { DeliveryRoutesPage } from "./modules/routing/pages";
import { PurchaseSuggestionsPage, SupplierQuotesPage } from "./modules/smart-purchasing/pages";
import { SaaSSubscriptionsPage } from "./modules/saas-subscriptions/pages";
import { CompanySubscriptionPage } from "./modules/saas-subscriptions/components/CompanySubscriptionPage";
import { MarketplaceIntegrationsPage, MarketplaceOrdersPage } from "./modules/marketplace";
import { FiscalDocumentsPage, FiscalSettingsPage } from "./modules/fiscal/pages";
import { MultiStorePage } from "./modules/multi-store/pages";
import { BackupSettingsPage, SaasBackupPage, GoogleDriveCallbackPage } from "./modules/backup/pages";
import { PublicSommelierPage, PublicSommelierTotemPage } from "./modules/sommelier";

// Tenant pages - Lazy loaded
const TenantAutoatendimento = lazy(() => import("./pages/tenant/TenantAutoatendimento"));
const TenantKDS = lazy(() => import("./pages/tenant/TenantKDS"));
const TenantKDSExpedition = lazy(() => import("./pages/tenant/TenantKDSExpedition"));
const TenantEntregador = lazy(() => import("./pages/tenant/TenantEntregador"));
const TenantGarcom = lazy(() => import("./pages/tenant/TenantGarcom"));
const TenantWeb = lazy(() => import("./pages/tenant/TenantWeb"));
const TenantBalanca = lazy(() => import("./pages/tenant/TenantBalanca"));
const TenantTotem = lazy(() => import("./pages/tenant/TenantTotem"));
const TenantTV = lazy(() => import("./pages/tenant/TenantTV"));
const TenantRoleta = lazy(() => import("./pages/tenant/TenantRoleta"));
const TenantDelivery = lazy(() => import("./pages/tenant/TenantDelivery"));

// Batch Operations - Lazy loaded
const BatchOperationsPage = lazy(() => import("./modules/batch-operations/pages/BatchOperationsPage"));

// =============================================================================
// LOADING FALLBACK - Spinner simples para lazy loading
// =============================================================================
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Inicializa monitoramento de erros global
initErrorMonitoring();

// =============================================================================
// TOAST GLOBAL SUPPRESSION
// A pedido do usuário, TODOS os toasts/balões/avisos são suprimidos.
// Esta função desativa completamente o Sonner antes de qualquer componente ser renderizado.
// =============================================================================
function disableAllSonnerToasts() {
  try {
    const anyToast = sonnerToast as any;
    if (anyToast.__globallyDisabled) return;
    anyToast.__globallyDisabled = true;

    // Substituir todos os métodos por no-ops
    const noop = (..._args: any[]) => ({ id: '', dismiss: () => {}, update: () => {} });
    
    anyToast.success = noop;
    anyToast.error = noop;
    anyToast.info = noop;
    anyToast.warning = noop;
    anyToast.message = noop;
    anyToast.loading = noop;
    anyToast.custom = noop;
    anyToast.promise = () => Promise.resolve();
    anyToast.dismiss = () => {};
    
    // Também substituir a função principal do toast
    Object.assign(sonnerToast, noop);
  } catch (e) {
    console.warn('Failed to disable toasts:', e);
  }
}

// Executar IMEDIATAMENTE (antes de qualquer render)
disableAllSonnerToasts();

const App = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          {/* Toast UIs desativados a pedido do usuário */}
          <BrowserRouter>
            <ErrorBoundary>
              {/* Initialize PWA manifest based on current route */}
              <PWAManifestInitializer />
              <OfflineIndicator />
              <PWAInstallPrompt />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ========================================== */}
                  {/* ISOLATED PWA ROUTES - NO AuthProvider      */}
                  {/* Each PWA has its own manifest and scope    */}
                  {/* Pattern: /:slug/:function for restaurant-scoped PWAs */}
                  {/* ========================================== */}
                  
                  {/* PWA Entry Routes - Universal entry point for installed PWAs */}
                  {/* MUST be outside AuthProvider for public access */}
                  <Route path="/pwa/:function" element={<PWAEntryPage />} />
                  
                  {/* NEW: Unified PWA Routes - /:slug/:function */}
                  {/* These routes MUST be OUTSIDE AuthProvider for PIN-based session isolation */}
                  <Route path="/:slug/totem" element={<TenantTotemPWA />} />
                  <Route path="/:slug/tablet" element={<TenantTabletPWA />} />
                  <Route path="/:slug/entregador" element={<TenantEntregadorPWA />} />
                  <Route path="/:slug/entregador/app" element={<TenantEntregadorAppPWA />} />
                  
                  {/* Scheduled Orders PWA - ISOLATED from Delivery */}
                  {/* Primary routes: /scheduled-orders and /scheduled-orders/:companySlug */}
                  <Route path="/scheduled-orders" element={<ScheduledOrdersPWA />} />
                  <Route path="/scheduled-orders/:companySlug" element={<ScheduledOrdersPWA />} />
                  {/* Legacy routes for backward compatibility */}
                  <Route path="/:slug/scheduled-orders" element={<ScheduledOrdersPWA />} />
                  <Route path="/pwa/scheduled-orders" element={<ScheduledOrdersPWA />} />
                  {/* Garçom PWA Routes - PIN-based auth, ISOLATED from AuthProvider */}
                  {/* Login page - no session required */}
                  <Route path="/:slug/garcom" element={<TenantGarcomPWA />} />
                  
                  {/* All authenticated routes wrapped in WaiterPWALayout for SINGLE session management */}
                  <Route path="/:slug/garcom" element={<WaiterPWALayout />}>
                    <Route path="app" element={<TenantGarcomAppPWA />} />
                    <Route path="fila" element={<PWAWaiterWaitlistScreen />} />
                    <Route path="mesas" element={<PWAWaiterTablesScreen />} />
                    <Route path="mesa/:tableId" element={<PWAWaiterTableDetailScreen />} />
                    <Route path="comandas" element={<PWAWaiterComandasScreen />} />
                    <Route path="comanda/:comandaId" element={<PWAWaiterComandaDetailScreen />} />
                  </Route>
                  
                  {/* PWA Entry Routes - redirects to /:slug/:function */}
                  <Route path="/pwa/:function" element={<PWAEntryPage />} />
                  
                  {/* Entregador slug-based login */}
                  <Route path="/entregador/:companySlug" element={<EntregadorLogin />} />
                  <Route path="/entregador/app" element={
                    <EntregadorContextRestorer>
                      <EntregadorApp />
                    </EntregadorContextRestorer>
                  } />
                  
                  {/* Pizza KDS PWA - PIN-based auth, ISOLATED from AuthProvider */}
                  <Route path="/pwa/pizza-kds" element={<PizzaKDSApp />} />
                  
                  {/* Pizza KDS V2 PWA - Completely new multi-step system */}
                  <Route path="/pwa/pizza-kds-v2" element={<PizzaKdsV2App />} />
                  
                  {/* PUBLIC RESERVATIONS - Must be OUTSIDE AuthProvider */}
                  <Route path="/:slug/reserva" element={<PublicReservationBySlug />} />
                  
                  {/* PUBLIC TICKET REDEEM - QR Code scanning */}
                  <Route path="/ticket/:code" element={<TicketRedeem />} />
                  
                  {/* All other routes require AuthProvider/CompanyProvider */}
                  <Route path="/*" element={
                    <AuthProvider>
                      <CompanyProvider>
                        <CompanyAccessGuard>
                          <InternalMessagePrintListener />
                          <KitchenPrintListener />
                          <ProactiveAgentProvider>
                            <Routes>
                    {/* Reseller Routes */}
                    <Route path="/saas/resellers" element={<ResellerManagement />} />
                    <Route path="/reseller/dashboard" element={<ResellerDashboard />} />
                    <Route path="/reseller/branding" element={<ResellerBranding />} />

                    {/* SaaS Admin Routes */}
                    <Route path="/saas" element={<SaasDashboard />} />
                    <Route path="/saas/companies" element={<SaasCompanies />} />
                    <Route path="/saas/companies/:id" element={<SaasCompanyDetails />} />
                    <Route path="/saas/plans" element={<SaasPlans />} />
                    <Route path="/saas/subscriptions" element={<SaasSubscriptions />} />
                    <Route path="/saas/templates" element={<SaasTemplates />} />
                    <Route path="/saas/audit" element={<SaasAudit />} />
                    <Route path="/saas/users" element={<SaasUsers />} />
                    <Route path="/saas/licenses" element={<SaasLicenses />} />
                    <Route path="/saas/backup-restore" element={<SaasBackupRestore />} />
                    
                    {/* Onboarding */}
                    <Route path="/onboarding" element={<Onboarding />} />
                    
                    {/* Blocked page */}
                    <Route path="/bloqueado" element={<Blocked />} />
                    
                    {/* Quick Wins - Demo & ROI */}
                    <Route path="/demo" element={<Demo />} />
                    <Route path="/roi-calculator" element={<ROICalculator />} />
                    <Route path="/pos-simulator" element={<SmartPOSSimulator />} />
                    
                    <Route path="/" element={<RootEntry />} />
                    <Route path="/performance-panel" element={<PerformancePanel />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/empresa" element={<Company />} />
                    <Route path="/company" element={<Company />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/subcategories" element={<Subcategories />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/ai-product-import" element={<AIProductImport />} />
                    <Route path="/flavors" element={<Flavors />} />
                    <Route path="/optional-groups" element={<OptionalGroups />} />
                    <Route path="/advanced-menu" element={<AdvancedMenu />} />
                    <Route path="/batch-actions" element={<BatchActions />} />
                    <Route path="/batch-operations" element={<BatchOperationsPage />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/marketing" element={<Marketing />} />
                    <Route path="/promotions" element={<Promotions />} />
                    <Route path="/my-links" element={<MyLinks />} />
                    <Route path="/my-subscription" element={<SaaSSubscriptionsPage />} />
                    
                    {/* Settings sub-pages */}
                    <Route path="/settings/branding" element={<SettingsBranding />} />
                    <Route path="/settings/integrations" element={<SettingsIntegrations />} />
                    <Route path="/settings/integration-hub" element={<IntegrationHub />} />
                    <Route path="/settings/tef" element={<SettingsTEF />} />
                    <Route path="/settings/ai" element={<SettingsAI />} />
                    <Route path="/settings/layout" element={<SettingsLayout />} />
                    <Route path="/settings/printing" element={<SettingsPrinting />} />
                    <Route path="/settings/pedido-online" element={<SettingsOnlineMenu />} />
                    <Route path="/settings/online-store" element={<SettingsOnlineStore />} />
                    <Route path="/settings/delivery" element={<SettingsDelivery />} />
                    <Route path="/settings/delivery-simulator" element={<DeliverySimulator />} />
                    <Route path="/settings/kds" element={<SettingsKDS />} />
                    <Route path="/settings/timers" element={<SettingsTimers />} />
                    <Route path="/settings/auto-print" element={<SettingsPrinting />} />
                    <Route path="/settings/pizza" element={<SettingsPizza />} />
                    <Route path="/settings/wheel" element={<SettingsWheel />} />
                    <Route path="/settings/panic" element={<SettingsPanic />} />
                    <Route path="/settings/customers" element={<SettingsCustomers />} />
                    <Route path="/settings/cash" element={<SettingsCash />} />
                    <Route path="/settings/orders" element={<SettingsOrders />} />
                    <Route path="/settings/table" element={<SettingsTable />} />
                    <Route path="/settings/sounds" element={<SettingsSounds />} />
                    <Route path="/settings/scale" element={<SettingsScale />} />
                    <Route path="/settings/sommelier" element={<SettingsSommelier />} />
                    <Route path="/settings/kiosk" element={<SettingsKiosk />} />
                    <Route path="/settings/proactive-agent" element={<SettingsProactiveAgent />} />
                    <Route path="/settings/deliverer-tracking" element={<SettingsDelivererTracking />} />
                    <Route path="/settings/smartpos" element={<SettingsSmartPOS />} />
                    <Route path="/settings/operator-permissions" element={<SettingsOperatorPermissions />} />
                    <Route path="/settings/fiserv" element={<FiservSettings />} />
                    <Route path="/settings/subscription" element={<CompanySubscriptionPage />} />
                    <Route path="/settings/units" element={<SettingsUnits />} />
                    <Route path="/settings/waiter-pin" element={<SettingsWaiterPIN />} />
                    <Route path="/settings/waiters" element={<SettingsWaiters />} />
                    <Route path="/settings/pizza-kds" element={<PizzaKDSSettingsPage />} />
                    <Route path="/flavor-highlight-groups" element={<FlavorHighlightGroups />} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin/receipt-editor" element={<ReceiptLayoutEditor />} />
                    <Route path="/admin/kitchen-ticket-editor" element={<KitchenTicketEditor />} />
                    
                    {/* Universal Access Route - Single QR code entry for ALL PWAs */}
                    <Route path="/access/:slug" element={<UniversalAccessPage />} />
                    
                    {/* Token-based routes (preferred) - Public, no guard */}
                    <Route path="/m/:token" element={<PublicMenuByToken />} />
                    <Route path="/tv/:token" element={<PublicTVByToken />} />
                    <Route path="/r/:token" element={<PublicRoletaByToken />} />
                    {/* Back-compat: /roleta/:slug -> /:slug/roleta */}
                    <Route path="/roleta/:slug" element={<RoletaSlugRedirect />} />
                    {/* Back-compat: /reserva/:slug -> /:slug/reserva */}
                    <Route path="/reserva/:slug" element={<ReservaSlugRedirect />} />
                    <Route path="/kds/:token" element={<PublicKDSByToken />} />
                    <Route path="/ss/:token" element={<PublicSelfServiceByToken />} />
                    <Route path="/balanca/:token" element={<ScaleTerminal />} />
                    <Route path="/kiosk/:token" element={<KioskPublic />} />
                    <Route path="/gps/:token" element={<PublicGpsMap />} />

                    {/* Painel de Chamada (rota mais específica para evitar colisão com rotas tenant) */}
                    <Route path="/painel-chamada/t/:token" element={<PublicCallPanel />} />
                    {/* Compatibilidade */}
                    <Route path="/painel-chamada/:token" element={<PublicCallPanel />} />
                    
                    {/* Sommelier (Public) */}
                    <Route path="/sommelier/:token" element={<PublicSommelierPage />} />
                    <Route path="/sommelier-totem/:token" element={<PublicSommelierTotemPage />} />
                    {/* Compat: link "enólogo" antigo */}
                    <Route path="/enologo/:token" element={<PublicSommelierPage />} />
                    <Route path="/enologo-totem/:token" element={<PublicSommelierTotemPage />} />
                    
                    {/* Rotisseur (Public) - Maître Rôtisseur */}
                    <Route path="/rotisseur/:token" element={<PublicRotisseurPage />} />
                    
                    {/* Review public page */}
                    <Route path="/review/:token" element={<PublicReviewByToken />} />
                    
                    {/* Order tracker PWA - Acompanhamento de pedido via QR code */}
                    <Route path="/acompanhar/:orderId" element={<PublicOrderTracker />} />
                    
                    {/* Queue tracker - Acompanhamento de fila de espera */}
                    <Route path="/fila/:token" element={<QueueTrackerPage />} />
                    
                    {/* KDS Waitlist - Painel de fila de espera para cozinha */}
                    <Route path="/kds-fila/:token" element={<KDSWaitlistPage />} />
                    {/* Delivery tracker - Rastreamento de entrega com mapa */}
                    <Route path="/rastrear/:token" element={<PublicDeliveryTracker />} />
                    
                    {/* Opt-out public page */}
                    <Route path="/optout/:token" element={<PublicOptOut />} />
                    
                    {/* QR Mesa/Comanda - Public */}
                    <Route path="/qr-mesa/:token" element={<PublicQRMesa />} />
                    <Route path="/qr-comanda/:token" element={<PublicQRComanda />} />
                    <Route path="/qr/mesa/:token" element={<PublicQRMesa />} />
                    <Route path="/qr/comanda/:token" element={<PublicQRComanda />} />
                    
                    {/* Reservations public pages */}
                    <Route path="/reservas/:slug" element={<PublicReservationBySlug />} />
                    <Route path="/reservation-portal/:slug" element={<PublicReservationPortal />} />

                    {/* Terminal Operador (rota interna - evita colisão com /:slug) */}
                    <Route path="/terminal" element={<OperatorTerminal />} />
                    
                    {/* Tenant-based public pages (/:slug/:app) */}
                    <Route path="/:slug/autoatendimento" element={<TenantAutoatendimento />} />
                    <Route path="/:slug/kds" element={<TenantKDS />} />
                    <Route path="/:slug/kds-expedicao" element={<TenantKDSExpedition />} />
                    <Route path="/:slug/entregador" element={<TenantEntregador />} />
                    <Route path="/:slug/entregador/:delivererToken" element={<TenantEntregador />} />
                    {/* Garçom routes REMOVED - now in isolated PWA section above AuthProvider */}
                    <Route path="/:slug/pdv" element={<TenantPDVPWA />} />
                    <Route path="/:slug/terminal" element={<TenantTerminalPWA />} />
                    <Route path="/:slug/web" element={<TenantWeb />} />
                    <Route path="/:slug/delivery" element={<TenantDelivery />} />
                    <Route path="/:slug/balanca" element={<TenantBalanca />} />
                    <Route path="/:slug/totem" element={<TenantTotem />} />
                    <Route path="/:slug/tv" element={<TenantTV />} />
                    <Route path="/:slug/roleta" element={<TenantRoleta />} />
                    <Route path="/:slug/enologo/:token" element={<PublicSommelierPage />} />
                    
                    {/* Loyalty Customer Portal */}
                    <Route path="/:slug/fidelidade" element={<LoyaltyCustomerPortal />} />
                    
                    {/* Multi-Store Module Route - Must come before /:slug catch-all */}
                    <Route path="/multi-store" element={<MultiStorePage />} />
                    
                    {/* Slug-based menu (must come after ALL internal routes) */}
                    <Route path="/:slug" element={<PublicMenuBySlug />} />
                    
                    <Route path="/delivery-menu" element={<DeliveryMenu />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/deliverers" element={<Deliverers />} />
                    <Route path="/deliverer-tracking" element={<DelivererTracking />} />
                    <Route path="/deliverer-settlement" element={<DelivererSettlement />} />
                    <Route path="/deliverer-rankings" element={<DelivererRankings />} />
                    <Route path="/banners" element={<Banners />} />
                    <Route path="/tv-menu" element={<TVMenuPublic />} />
                    <Route path="/prizes" element={<Prizes />} />
                    <Route path="/prize-wheel" element={<PrizeWheel />} />
                    <Route path="/ai-central" element={<AICentral />} />
                    <Route path="/ai-recommendations" element={<AICentral />} />
                    <Route path="/ai-suggestions" element={<AICentral />} />
                    <Route path="/ai-operational" element={<AICentral />} />
                    <Route path="/ai-menu-creative" element={<AIMenuCreative />} />
                    <Route path="/ai-tv-scheduler" element={<AITVScheduler />} />
                    <Route path="/ai-marketing-posts" element={<AIMarketingPosts />} />
                    <Route path="/ai-churn" element={<ChurnPrediction />} />
                    
                    {/* AI Advanced Modules - International Features */}
                    <Route path="/ai-voice" element={<VoiceAISettings />} />
                    <Route path="/smart-waitlist" element={<SmartWaitlistPage />} />
                    <Route path="/ai-concierge" element={<AIConciergeSettings />} />
                    <Route path="/predictive-upselling" element={<PredictiveUpsellingSettings />} />
                    <Route path="/staff-performance" element={<StaffPerformancePage />} />
                    <Route path="/ai-behavior" element={<AIBehaviorAnalysisPage />} />
                    
                    <Route path="/dynamic-pricing" element={<DynamicPricing />} />
                    <Route path="/smart-kds" element={<SmartKDSSettings />} />
                    <Route path="/selfservice-advanced" element={<SelfserviceAdvancedSettings />} />
<Route path="/campaigns" element={<Campaigns />} />
<Route path="/tv-screens" element={<TVScreens />} />
<Route path="/qa" element={<QA />} />
<Route path="/debug/errors" element={<DebugErrors />} />
<Route path="/repurchase" element={<Repurchase />} />
                    <Route path="/profiles" element={<Profiles />} />
                    <Route path="/kds" element={<KDS />} />
                    <Route path="/kds/settings" element={<Suspense fallback={<PageLoader />}><KDSSettingsPage /></Suspense>} />
                    <Route path="/whatsapp" element={<WhatsApp />} />
                    <Route path="/phone-order" element={<PhoneOrder />} />
                    <Route path="/delay-reports" element={<DelayReports />} />
                    <Route path="/reports/fiado" element={<FiadoReports />} />
                    <Route path="/reports/sales-by-period" element={<SalesByPeriodReport />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/weekly-reports" element={<WeeklyReports />} />
                    <Route path="/bill-split" element={<BillSplitAndTips />} />
                    
                    {/* Unified Scheduling Module */}
                    <Route path="/agendamentos" element={<SchedulingModule />}>
                      <Route path="pedidos" element={<ScheduledOrdersTab />} />
                      <Route path="producao" element={<ProductionTab />} />
                      <Route path="relatorios" element={<ReportsTab />} />
                    </Route>
                    
                    {/* Legacy routes - redirect to new unified module */}
                    <Route path="/scheduled-orders" element={<Navigate to="/agendamentos/pedidos" replace />} />
                    <Route path="/scheduled-orders-report" element={<Navigate to="/agendamentos/producao" replace />} />
                    
                    <Route path="/settings/footer" element={<SettingsFooter />} />
                    
                    {/* Reports Hub Module Routes */}
                    <Route path="/reports-hub" element={<ReportsHubPage />} />
                    <Route path="/reports-hub/sales" element={<SalesReportsPage />} />
                    <Route path="/reports-hub/stock" element={<StockReportsPage />} />
                    
                    {/* Sales Projection Module */}
                    <Route path="/sales-projection" element={<SalesProjectionPage />} />
                    <Route path="/system-manual" element={<SystemManual />} />
                    <Route path="/documentacao" element={<DocumentacaoDownload />} />
                    <Route path="/auditoria" element={<AuditoriaRelatorio />} />
                    <Route path="/auditoria/bloco1" element={<Bloco1Relatorio />} />
                    <Route path="/auditoria/bloco2" element={<Bloco2Relatorio />} />
                    <Route path="/auditoria/bloco3" element={<Bloco3Relatorio />} />
                    <Route path="/auditoria/bloco4" element={<Bloco4Relatorio />} />
                    <Route path="/auditoria/bloco5" element={<Bloco5Relatorio />} />
                    <Route path="/auditoria/bloco6" element={<Bloco6Relatorio />} />
                    <Route path="/auditoria/bloco7" element={<Bloco7Relatorio />} />
                    <Route path="/auditoria/bloco8" element={<Bloco8Relatorio />} />
                    <Route path="/auditoria/bloco9" element={<Bloco9Relatorio />} />
                    <Route path="/auditoria/final" element={<AuditoriaFinal />} />
                    <Route path="/business-intelligence" element={<BusinessIntelligence />} />
                    <Route path="/bi-advanced" element={<BIAdvanced />} />
                    <Route path="/loyalty" element={<Loyalty />} />
                    <Route path="/deliverer-app" element={<DelivererApp />} />
                    <Route path="/chat-monitor" element={<ChatMonitor />} />
                    <Route path="/cash-register" element={<CashRegister />} />
                    <Route path="/accounts-payable" element={<AccountsPayable />} />
                    <Route path="/customer-credits" element={<CustomerCredits />} />
                    <Route path="/finance-dashboard" element={<FinanceDashboard />} />
                    <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
                    <Route path="/cash-history" element={<CashHistory />} />
                    <Route path="/payment-methods" element={<PaymentMethods />} />
                    <Route path="/bank-accounts" element={<BankAccounts />} />
                    <Route path="/bank-reconciliation" element={<BankReconciliation />} />
                    <Route path="/import-export" element={<ImportExport />} />
                    <Route path="/combos" element={<Combos />} />
                    <Route path="/rodizio-config" element={<RodizioConfig />} />
                    <Route path="/rodizio-consumption" element={<RodizioConsumptionReport />} />
                    <Route path="/timer-dashboard" element={<TimerDashboard />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/coupons" element={<Coupons />} />
                    <Route path="/demand-forecast" element={<DemandForecast />} />
                    <Route path="/churn-prediction" element={<ChurnPrediction />} />
                    <Route path="/referral-program" element={<ReferralProgram />} />
                    <Route path="/gamification" element={<Gamification />} />
                    <Route path="/chatbot-settings" element={<ChatbotSettings />} />
                    <Route path="/tables" element={<Tables />} />
                    <Route path="/tables-register" element={<TablesRegister />} />
                    <Route path="/settings/tables" element={<SettingsTables />} />
                    <Route path="/settings/reservations" element={<SettingsReservations />} />
                    <Route path="/comandas" element={<Comandas />} />
                    <Route path="/comandas/:id" element={<ComandaDetail />} />
                    <Route path="/self-service" element={<SelfService />} />
                    <Route path="/pdv-loja" element={<PDVLoja />} />
                    <Route path="/internal-messages" element={<InternalMessages />} />
                    <Route path="/reservations" element={<Reservations />} />
                    <Route path="/waitlist" element={<WaitlistPage />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    
                    {/* New Modules - Self-checkout, Expedition, Performance, Tax AI */}
                    <Route path="/self-checkout" element={<SelfCheckout />} />
                    <Route path="/delivery-expedition" element={<DeliveryExpedition />} />
                    <Route path="/deliverer-badge" element={<DelivererBadge />} />
                    <Route path="/operations-performance" element={<OperationsPerformance />} />
                    <Route path="/tax-ai-advisor" element={<TaxAIAdvisor />} />
                    
                    {/* ERP Financeiro Routes */}
                    <Route path="/erp" element={<ERPDashboardPage />} />
                    <Route path="/erp/dashboard" element={<ERPDashboardPage />} />
                    <Route path="/erp/sales-report" element={<ERPSalesReportPage />} />
                    <Route path="/erp/top-products" element={<ERPTopProductsPage />} />
                    <Route path="/erp/discounts" element={<ERPDiscountsPage />} />
                    <Route path="/erp/delivery-fees" element={<ERPDeliveryFeesPage />} />
                    <Route path="/erp/receivables" element={<ERPReceivablesPage />} />
                    <Route path="/erp/payables" element={<ERPPayablesPage />} />
                    <Route path="/erp/cost-centers" element={<ERPCostCentersPage />} />
                    <Route path="/erp/product-costs" element={<ERPProductCostsPage />} />
                    <Route path="/erp/dre" element={<ERPDREPage />} />
                    <Route path="/erp/dre-advanced" element={<ERPDREAdvancedPage />} />
                    <Route path="/erp/cmv" element={<ERPCMVPage />} />
                    <Route path="/erp/cash-flow" element={<ERPCashFlowPage />} />
                    <Route path="/erp/executive" element={<ERPExecutivePage />} />
                    <Route path="/erp/budgets" element={<ERPBudgetsPage />} />
                    <Route path="/erp/alerts" element={<ERPAlertsPage />} />
                    
                    {/* ERP Inventory Routes */}
                    <Route path="/erp/stock" element={<ERPStockDashboardPage />} />
                    <Route path="/erp/items" element={<ERPItemsPage />} />
                    <Route path="/erp/suppliers" element={<ERPSuppliersPage />} />
                    <Route path="/erp/purchases" element={<ERPPurchasesPage />} />
                    <Route path="/erp/recipes" element={<ERPRecipesPage />} />
                    <Route path="/erp/stock-management" element={<ERPStockPage />} />
                    <Route path="/erp/movements" element={<ERPMovementsPage />} />
                    <Route path="/erp/inventory-count" element={<ERPInventoryCountPage />} />
                    <Route path="/erp/cmv-analysis" element={<ERPCMVAnalysisPage />} />
                    <Route path="/erp/pricing" element={<ERPPricingPage />} />
                    <Route path="/erp/profit" element={<ERPProfitPage />} />

                    {/* Legacy ERP Routes (compatibilidade) */}
                    <Route path="/erp-inventory" element={<Navigate to="/erp" replace />} />
                    <Route path="/erp-inventory/items" element={<Navigate to="/erp/items" replace />} />
                    <Route path="/erp-inventory/suppliers" element={<Navigate to="/erp/suppliers" replace />} />
                    <Route path="/erp-inventory/purchases" element={<Navigate to="/erp/purchases" replace />} />
                    <Route path="/erp-inventory/recipes" element={<Navigate to="/erp/recipes" replace />} />
                    <Route path="/erp-inventory/stock" element={<Navigate to="/erp/stock" replace />} />
                    <Route path="/erp-inventory/movements" element={<Navigate to="/erp/movements" replace />} />
                    <Route path="/erp-inventory/inventory-count" element={<Navigate to="/erp/inventory-count" replace />} />
                    <Route path="/erp-finance/cmv" element={<Navigate to="/erp/cmv" replace />} />
                    <Route path="/erp-finance/pricing" element={<Navigate to="/erp/pricing" replace />} />
                    <Route path="/erp-finance/profit" element={<Navigate to="/erp/profit" replace />} />
                    
                    {/* CRM Routes */}
                    <Route path="/crm" element={<CRMDashboardPage />} />
                    <Route path="/crm/leads" element={<CRMLeadsPage />} />
                    <Route path="/crm/customers" element={<CRMCustomersPage />} />
                    <Route path="/crm/activities" element={<CRMActivitiesPage />} />
                    <Route path="/crm/automations" element={<CRMAutomationsPage />} />
                    <Route path="/crm/pipeline" element={<CRMPipelinePage />} />
                    
                    {/* Integrations Routes */}
                    <Route path="/integrations" element={<IntegrationsDashboardPage />} />
                    <Route path="/integrations/whatsapp" element={<WhatsAppCenterPage />} />
                    <Route path="/integrations/payments" element={<PaymentCenterPage />} />
                    
                    {/* Marketing Module Routes */}
                    <Route path="/marketing-hub" element={<MarketingDashboardPage />} />
                    <Route path="/marketing-hub/campaigns" element={<MarketingCampaignsPage />} />
                    <Route path="/marketing-hub/automations" element={<MarketingAutomationsPage />} />
                    
                    {/* Waiter PWA Routes - redirect to PWA entry */}
                    <Route path="/waiter" element={<Navigate to="/pwa/garcom" replace />} />
                    <Route path="/waiter/*" element={<Navigate to="/pwa/garcom" replace />} />
                    
                    {/* Tablet & Kiosk PWA Routes are now isolated OUTSIDE AuthProvider (see top of Routes) */}
                    
                    {/* Tablet Kiosk Legacy (internal) */}
                    <Route path="/tablet-kiosk" element={<TabletKiosk />} />
                    <Route path="/settings/tablet-autoatendimento" element={<SettingsTabletAutoatendimento />} />
                    <Route path="/settings/tv-display" element={<SettingsTVDisplay />} />
                    <Route path="/service-calls" element={<ServiceCallsMonitor />} />
                    <Route path="/print-station" element={<PrintStation />} />
                    <Route path="/operator-terminal" element={<OperatorTerminal />} />
                    
                    {/* Employees Module Routes */}
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route path="/employees/schedules" element={<EmployeeSchedulesPage />} />
                    <Route path="/employees/commissions" element={<EmployeeCommissionsPage />} />
                    
                    {/* Assets Module Routes */}
                    <Route path="/assets" element={<AssetsPage />} />
                    <Route path="/assets/maintenance" element={<AssetMaintenancePage />} />
                    
                    {/* Routing Module Routes */}
                    <Route path="/delivery-routes" element={<DeliveryRoutesPage />} />
                    
                    {/* Smart Purchasing Module Routes */}
                    <Route path="/purchase-suggestions" element={<PurchaseSuggestionsPage />} />
                    <Route path="/supplier-quotes" element={<SupplierQuotesPage />} />
                    
                    {/* SaaS Subscriptions Route */}
                    <Route path="/saas-subscriptions" element={<SaaSSubscriptionsPage />} />
                    
                    {/* Marketplace Module Routes */}
                    <Route path="/marketplace" element={<MarketplaceIntegrationsPage />} />
                    <Route path="/marketplace/orders" element={<MarketplaceOrdersPage />} />
                    
                    {/* Fiscal Module Routes */}
                    <Route path="/fiscal" element={<FiscalDocumentsPage />} />
                    <Route path="/fiscal/settings" element={<FiscalSettingsPage />} />

                    {/* Backup Module Routes */}
                    <Route path="/settings/backup" element={<BackupSettingsPage />} />
                    <Route path="/saas/backup" element={<SaasBackupPage />} />
                    <Route path="/google-drive/callback" element={<GoogleDriveCallbackPage />} />
                    
                    {/* Comanda Validator Module - Public and Settings */}
                    <Route path="/validar-comanda/:token" element={<ComandaValidatorPublic />} />
                    <Route path="/comanda-validator" element={<ComandaValidatorSettings />} />
                    
                    {/* Catch-all route */}
                    <Route path="*" element={<NotFound />} />
                            </Routes>
                          </ProactiveAgentProvider>
                        </CompanyAccessGuard>
                      </CompanyProvider>
                    </AuthProvider>
                  } />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
