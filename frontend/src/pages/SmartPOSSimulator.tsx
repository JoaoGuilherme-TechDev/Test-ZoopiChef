import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  CreditCard, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Smartphone,
  DollarSign,
  Clock,
  Zap,
  Settings,
  Activity,
  Loader2,
  Calculator,
  Printer,
  Receipt,
  Banknote,
  ChevronsUp,
  LockKeyhole,
  LockKeyholeOpen,
  ChefHat,
  Menu,
  ShoppingCart,
  Search
} from "lucide-react";
import { supabase } from '@/lib/supabase-shim';
import { SmartPOSCashClosing } from "@/components/smartpos/SmartPOSCashClosing";
import { SmartPOSPrinterSettings, getPrinterConfig } from "@/components/smartpos/SmartPOSPrinterSettings";
import { SmartPOSMenu, SmartPOSMenuAction } from "@/components/smartpos/SmartPOSMenu";
import { SmartPOSComandas } from "@/components/smartpos/SmartPOSComandas";
import { SmartPOSTables } from "@/components/smartpos/SmartPOSTables";
import { SmartPOSSalesHistory } from "@/components/smartpos/SmartPOSSalesHistory";
import { SmartPOSSaleReverse } from "@/components/smartpos/SmartPOSSaleReverse";
import { SmartPOSSaleReprint } from "@/components/smartpos/SmartPOSSaleReprint";
import { SmartPOSCredit } from "@/components/smartpos/SmartPOSCredit";
import { SmartPOSCustomerForm } from "@/components/smartpos/SmartPOSCustomerForm";
import { SmartPOSProductSearch, CartItem } from "@/components/smartpos/SmartPOSProductSearch";
import { PanicButton } from "@/components/panic/PanicButton";
import { useComandas } from "@/hooks/useComandas";
import { useTableSessions } from "@/hooks/useTableSessions";
import { useCustomersWithCredit } from "@/hooks/useCustomerCredit";
import { useCompany } from "@/hooks/useCompany";
import { 
  useSmartPOSOpenSession, 
  useSmartPOSCashSummary,
  useOpenSmartPOSCash,
  SmartPOSCashSession,
  SmartPOSCashSummary
} from "@/hooks/useSmartPOSCashSession";
import { SmartPOSDevice } from "@/hooks/useSmartPOS";
import { SmartPOSPrintConfig } from "@/lib/print/smartPOSPrint";

interface PendingTransaction {
  id: string;
  amount_cents: number;
  payment_method: string;
  installments: number;
  customer_name?: string;
  order_id?: string;
  session_id?: string;
  status: string;
  created_at: string;
}

interface DeviceInfo {
  id: string;
  device_serial: string;
  device_name: string;
  company_id: string;
  is_active: boolean;
  config_json?: Record<string, unknown>;
}

interface CompanyInfo {
  id: string;
  name: string;
}

const CARD_BRANDS = ["visa", "mastercard", "elo", "amex", "hipercard"];

export default function SmartPOSSimulator() {
  // Configuração
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [deviceSerial, setDeviceSerial] = useState("SIM-" + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  
  // Status
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  
  // Transações
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [processingTransaction, setProcessingTransaction] = useState<PendingTransaction | null>(null);
  
  // Logs
  const [logs, setLogs] = useState<string[]>([]);

  // Modals
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [closeCashDialog, setCloseCashDialog] = useState(false);
  const [printerSettingsOpen, setPrinterSettingsOpen] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showComandas, setShowComandas] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaleReverse, setShowSaleReverse] = useState(false);
  const [showSaleReprint, setShowSaleReprint] = useState(false);
  const [showCreditReceive, setShowCreditReceive] = useState(false);
  const [showCreditLaunch, setShowCreditLaunch] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState("transactions");

  // Data hooks
  const { data: companyData } = useCompany();
  const { comandas: openComandas = [] } = useComandas(['open']);
  const { activeSessions: openTables = [] } = useTableSessions();
  const { customersWithCredit = [] } = useCustomersWithCredit();

  // Cash session hooks
  const { data: openSession, isLoading: loadingSession } = useSmartPOSOpenSession(device?.id || null);
  const { data: cashSummary } = useSmartPOSCashSummary(openSession?.id || null, device?.id || null);
  const openCash = useOpenSmartPOSCash();

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  }, []);

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Get printer config - convert from storage format to print format
  const printerConfigFromDevice = device ? getPrinterConfig(device as unknown as SmartPOSDevice) : null;
  const printerConfig: SmartPOSPrintConfig = printerConfigFromDevice 
    ? { 
        paperWidth: printerConfigFromDevice.paper_width, 
        printStyle: printerConfigFromDevice.print_style,
        printerName: printerConfigFromDevice.printer_name,
        printerAddress: printerConfigFromDevice.printer_address
      }
    : { paperWidth: 80, printStyle: 'elegant' };

  // Auto-detectar empresa do usuário logado
  useEffect(() => {
    const detectCompany = async () => {
      setIsLoadingCompany(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, full_name')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profile?.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('id, name')
              .eq('id', profile.company_id)
              .single();
            
            if (company) {
              setCompanyId(company.id);
              setCompanyName(company.name);
              setOperatorName(profile.full_name || 'Operador');
              addLog(`🏢 Empresa detectada: ${company.name}`);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao detectar empresa:', error);
      } finally {
        setIsLoadingCompany(false);
      }
    };

    detectCompany();
  }, [addLog]);

  // Registrar dispositivo
  const registerDevice = async () => {
    if (!companyId) {
      toast.error("Informe o ID da empresa");
      return;
    }

    addLog("Registrando dispositivo...");

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smartpos-api/register`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          device_serial: deviceSerial,
          device_model: 'Simulador Web',
          provider: 'simulator',
          company_id: companyId,
          device_name: `Simulador ${deviceSerial}`,
          mode: 'pdv'
        })
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setAuthToken(data.auth_token);
      setDevice(data.device);
      setIsConnected(true);
      addLog(`✅ Dispositivo registrado: ${data.device.id}`);
      toast.success("Dispositivo conectado!");
      
      startPolling(data.auth_token);
    } catch (error) {
      addLog(`❌ Erro ao registrar: ${error}`);
      toast.error("Erro ao registrar dispositivo");
    }
  };

  // Buscar transações pendentes
  const fetchPendingTransactions = useCallback(async (token: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smartpos-api/pending-transactions`;
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-device-token': token
        }
      });

      const data = await res.json();
      setLastPoll(new Date());

      if (data.transactions && data.transactions.length > 0) {
        setPendingTransactions(data.transactions);
        addLog(`📥 ${data.transactions.length} transação(ões) pendente(s)`);
        
        new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAAd6fU2o9rOy1Tr9/fgVI/RIe60tWKYExrp9LBdEtcnM++eWJymb2ldW16rL6SZnSgu5eAfpSxl3qJl6GRhI6hmYmSlZ6NkZWcjpOWmo6TlpqOk5aajpOWmo6TlpqOk5aajpOWmo6TlpqOk5aajpOWmo6TlpqOk5aajpOWmo6TlpqOk5aajpOWmo2TlZqNk5WajZOVmo2TlZqNk5WajZOVmo2TlZqNk5WajZOVmo2TlZqNk5WajZOVmo2TlZqNk5WajZOVmo2TlZqMkpSZjJKUmYySlJmMkpSZjJKUmYySlJmMkpSZjJKUmYySlJmMkpSZjJKUmYySlJmMkpSZjJKUmYySlJmMkpSZjJKUmYySlJmMkpSZjJKUmYySlJmMkpSZjJKUmYySlJmMkpSYi5GTmIuRk5iLkZOYi5GTmIuRk5iLkZOYi5GTmIuRk5iLkZOYi5GTmIuRk5iLkZOYi5GTmIuRk5iLkZOYi5GTmIuRk5iLkZOYi5GTmIuRk5iLkZOYi5GTmIuRk5iLkZOYi5GTmIuRk5iLkZOYi5GTl4qQkpeKkJKXipCSl4qQkpeKkJKXipCSl4qQkpeKkJKXipCSl4qQkpeKkJKXipCSl4qQkpeKkJKXipCSl4qQkpeKkJKXipCSl4qQkpeKkJKXipCSl4qQkpeKkJKXipCSl4qQkpeKkJKXipCSlw==').play().catch(() => {});
      }
    } catch (error) {
      addLog(`⚠️ Erro ao buscar transações: ${error}`);
    }
  }, [addLog]);

  // Iniciar polling
  const startPolling = useCallback((token: string) => {
    setIsPolling(true);
    addLog("🔄 Iniciando monitoramento...");
    
    fetchPendingTransactions(token);
    
    const interval = setInterval(() => {
      fetchPendingTransactions(token);
    }, 3000);
    
    (window as unknown as Record<string, unknown>).__posSimulatorInterval = interval;
  }, [addLog, fetchPendingTransactions]);

  // Parar polling
  const stopPolling = () => {
    setIsPolling(false);
    const interval = (window as unknown as Record<string, unknown>).__posSimulatorInterval as NodeJS.Timeout;
    if (interval) {
      clearInterval(interval);
    }
    addLog("⏹️ Monitoramento pausado");
  };

  // Processar transação
  const processTransaction = async (transaction: PendingTransaction) => {
    if (!authToken) return;
    
    setProcessingTransaction(transaction);
    addLog(`💳 Processando transação ${transaction.id.slice(0, 8)}...`);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smartpos-api/transaction/${transaction.id}/process`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-device-token': authToken
        }
      });

      setPendingTransactions(prev => prev.filter(t => t.id !== transaction.id));
    } catch (error) {
      addLog(`❌ Erro: ${error}`);
      toast.error("Erro ao processar");
      setProcessingTransaction(null);
    }
  };

  // Completar transação
  const completeTransaction = async (approved: boolean) => {
    if (!authToken || !processingTransaction) return;

    const randomBrand = CARD_BRANDS[Math.floor(Math.random() * CARD_BRANDS.length)];
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    const randomNSU = Math.floor(100000 + Math.random() * 900000).toString();
    const randomAuth = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smartpos-api/transaction/${processingTransaction.id}/complete`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-device-token': authToken
        },
        body: JSON.stringify({
          status: approved ? 'approved' : 'declined',
          authorization_code: approved ? randomAuth : null,
          card_brand: randomBrand,
          card_last_digits: randomDigits,
          nsu: approved ? randomNSU : null,
          error_message: approved ? null : 'Transação recusada pelo simulador'
        })
      });

      const data = await res.json();

      if (approved) {
        addLog(`✅ APROVADA - ${randomBrand.toUpperCase()} ****${randomDigits} - Auth: ${randomAuth}`);
        toast.success("Transação aprovada!");
      } else {
        addLog(`❌ RECUSADA - Transação negada pelo operador`);
        toast.error("Transação recusada");
      }

      setProcessingTransaction(null);
    } catch (error) {
      addLog(`❌ Erro ao completar: ${error}`);
      toast.error("Erro ao completar transação");
    }
  };

  // Desconectar
  const disconnect = () => {
    stopPolling();
    setIsConnected(false);
    setAuthToken(null);
    setDevice(null);
    setPendingTransactions([]);
    setProcessingTransaction(null);
    addLog("🔌 Dispositivo desconectado");
    toast.info("Desconectado");
  };

  // Handle open cash
  const handleOpenCash = async () => {
    if (!device?.id || !operatorName || !openingBalance) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      await openCash.mutateAsync({
        deviceId: device.id,
        openingBalance: parseFloat(openingBalance.replace(',', '.')) || 0,
        operatorName,
      });
      setOpenCashDialog(false);
      setOpeningBalance('');
      addLog(`💵 Caixa aberto - ${operatorName}`);
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle print for production
  const handlePrint = (html: string) => {
    addLog("🖨️ Enviando para impressora Bluetooth...");
    
    // In a real implementation, this would send to the Bluetooth printer
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 200);
      };
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      const interval = (window as unknown as Record<string, unknown>).__posSimulatorInterval as NodeJS.Timeout;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Default summary for cash closing
  const defaultSummary: SmartPOSCashSummary = cashSummary || {
    totalTransactions: 0,
    totalRevenue: 0,
    paymentsSummary: {
      pix: { count: 0, total: 0 },
      credit: { count: 0, total: 0 },
      debit: { count: 0, total: 0 },
      cash: { count: 0, total: 0 },
      voucher: { count: 0, total: 0 },
    },
    expectedCash: 0,
  };

  // Handle add product to cart
  const handleAddToCart = (item: CartItem) => {
    setCartItems(prev => [...prev, item]);
    toast.success(`${item.product.name} adicionado!`);
  };

  // Get company logo
  const companyLogo = companyData?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header with Logo and Panic Button */}
        <div className="text-center py-4 relative">
          {/* Panic Button - top right */}
          <div className="absolute right-0 top-4">
            <PanicButton />
          </div>
          
          {/* Logo or default icon */}
          <div className="flex flex-col items-center gap-2 mb-2">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt="Logo" 
                className="h-16 w-auto object-contain"
              />
            ) : (
              <Smartphone className="h-10 w-10 text-primary" />
            )}
            <h1 className="text-2xl font-bold">Smart PDV</h1>
          </div>
          <p className="text-gray-400 text-sm">Terminal de pagamento inteligente</p>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-gray-500" />
            )}
            <span className={isConnected ? "text-green-500" : "text-gray-500"}>
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {openSession ? (
              <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                <LockKeyholeOpen className="w-3 h-3 mr-1" />
                Caixa Aberto
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-gray-700">
                <LockKeyhole className="w-3 h-3 mr-1" />
                Caixa Fechado
              </Badge>
            )}
            {isPolling && <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />}
          </div>
        </div>

        {/* Configuração (quando desconectado) */}
        {!isConnected && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5" />
                Configuração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCompany ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-gray-400">Detectando empresa...</span>
                </div>
              ) : (
                <>
                  {companyName && (
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                      <p className="text-sm text-green-400">✓ Empresa detectada automaticamente</p>
                      <p className="font-semibold text-white">{companyName}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-gray-300">ID da Empresa (UUID)</Label>
                    <Input
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="bg-gray-900 border-gray-600 text-white"
                      readOnly={!!companyName}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Serial do Dispositivo</Label>
                    <Input
                      value={deviceSerial}
                      onChange={(e) => setDeviceSerial(e.target.value)}
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>
                  <Button onClick={registerDevice} className="w-full" size="lg" disabled={!companyId}>
                    <Zap className="mr-2 h-5 w-5" />
                    Conectar Dispositivo
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main content when connected */}
        {isConnected && device && (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-6 gap-2">
              {/* Venda Rápida / Buscar Produto */}
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-3 bg-blue-900/20 border-blue-700 hover:bg-blue-900/40"
                onClick={() => setShowProductSearch(true)}
              >
                <Search className="h-5 w-5 text-blue-500" />
                <span className="text-xs mt-1">Buscar</span>
              </Button>

              {!openSession ? (
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-3 bg-green-900/20 border-green-700 hover:bg-green-900/40"
                  onClick={() => setOpenCashDialog(true)}
                >
                  <ChevronsUp className="h-5 w-5 text-green-500" />
                  <span className="text-xs mt-1">Abrir</span>
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-3 bg-red-900/20 border-red-700 hover:bg-red-900/40"
                  onClick={() => setCloseCashDialog(true)}
                >
                  <Calculator className="h-5 w-5 text-red-500" />
                  <span className="text-xs mt-1">Fechar</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-3 bg-purple-900/20 border-purple-700 hover:bg-purple-900/40"
                onClick={() => setShowMenu(true)}
              >
                <Menu className="h-5 w-5 text-purple-500" />
                <span className="text-xs mt-1">Menu</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-3 bg-gray-800 border-gray-600"
                onClick={() => setPrinterSettingsOpen(true)}
              >
                <Printer className="h-5 w-5 text-blue-500" />
                <span className="text-xs mt-1">Impressora</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-3 bg-gray-800 border-gray-600"
                onClick={disconnect}
              >
                <WifiOff className="h-5 w-5 text-gray-400" />
                <span className="text-xs mt-1">Sair</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-3 bg-gray-800 border-gray-600"
                onClick={() => isPolling ? stopPolling() : authToken && startPolling(authToken)}
              >
                <RefreshCw className={`h-5 w-5 ${isPolling ? 'text-green-500 animate-spin' : 'text-gray-400'}`} />
                <span className="text-xs mt-1">{isPolling ? 'On' : 'Off'}</span>
              </Button>
            </div>

            {/* Cash Summary when open */}
            {openSession && cashSummary && (
              <Card className="bg-gradient-to-br from-gray-800 to-gray-850 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-gray-400">Receita do Caixa</div>
                    <Badge variant="outline" className="text-xs">
                      {cashSummary.totalTransactions} vendas
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-green-400">
                    {formatCurrency(cashSummary.totalRevenue)}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                      <div className="text-xs text-blue-400">PIX</div>
                      <div className="text-sm font-bold">{cashSummary.paymentsSummary.pix.count}</div>
                    </div>
                    <div className="text-center p-2 bg-green-500/10 rounded-lg">
                      <div className="text-xs text-green-400">Créd</div>
                      <div className="text-sm font-bold">{cashSummary.paymentsSummary.credit.count}</div>
                    </div>
                    <div className="text-center p-2 bg-purple-500/10 rounded-lg">
                      <div className="text-xs text-purple-400">Déb</div>
                      <div className="text-sm font-bold">{cashSummary.paymentsSummary.debit.count}</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                      <div className="text-xs text-yellow-400">Din</div>
                      <div className="text-sm font-bold">{cashSummary.paymentsSummary.cash.count}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transação em processamento */}
            {processingTransaction && (
              <Card className="bg-blue-900 border-blue-700 animate-pulse">
                <CardContent className="p-6 text-center space-y-4">
                  <CreditCard className="h-16 w-16 mx-auto text-blue-300" />
                  <div>
                    <p className="text-3xl font-bold text-white">
                      {formatPrice(processingTransaction.amount_cents)}
                    </p>
                    <p className="text-blue-200 capitalize">
                      {processingTransaction.payment_method?.replace('_', ' ')} 
                      {processingTransaction.installments > 1 && ` - ${processingTransaction.installments}x`}
                    </p>
                    {processingTransaction.customer_name && (
                      <p className="text-sm text-blue-300 mt-2">
                        Cliente: {processingTransaction.customer_name}
                      </p>
                    )}
                  </div>
                  
                  <Separator className="bg-blue-700" />
                  
                  <p className="text-sm text-blue-200">Simular resposta da transação:</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-red-900 border-red-700 hover:bg-red-800 text-white"
                      onClick={() => completeTransaction(false)}
                    >
                      <XCircle className="mr-2 h-5 w-5" />
                      Recusar
                    </Button>
                    <Button
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => completeTransaction(true)}
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Aprovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de transações pendentes */}
            {!processingTransaction && pendingTransactions.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-white text-sm">
                    <DollarSign className="h-5 w-5 text-yellow-500" />
                    Transações Pendentes
                    <Badge variant="secondary" className="ml-auto">
                      {pendingTransactions.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-850 cursor-pointer transition-colors"
                      onClick={() => processTransaction(tx)}
                    >
                      <div>
                        <p className="font-bold text-lg">{formatPrice(tx.amount_cents)}</p>
                        <p className="text-sm text-gray-400 capitalize">
                          {tx.payment_method?.replace('_', ' ')}
                          {tx.installments > 1 && ` - ${tx.installments}x`}
                        </p>
                      </div>
                      <Button size="sm">Processar</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Aguardando transações */}
            {!processingTransaction && pendingTransactions.length === 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <Clock className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">Aguardando transações...</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Envie um pagamento pelo sistema principal
                  </p>
                  {lastPoll && (
                    <p className="text-xs text-gray-600 mt-4">
                      Última verificação: {lastPoll.toLocaleTimeString('pt-BR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Logs */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white text-sm">
                  <Activity className="h-4 w-4" />
                  Log de Atividades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-1 font-mono text-xs">
                    {logs.length === 0 ? (
                      <p className="text-gray-500">Nenhuma atividade...</p>
                    ) : (
                      logs.map((log, i) => (
                        <p key={i} className="text-gray-400">{log}</p>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}

        {/* Open Cash Dialog */}
        <Dialog open={openCashDialog} onOpenChange={setOpenCashDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-500" />
                Abrir Caixa
              </DialogTitle>
              <DialogDescription>
                Informe o saldo inicial para abrir o caixa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Operador</Label>
                <Input
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label>Saldo Inicial (R$)</Label>
                <Input
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="text-xl font-bold h-14 text-center"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCashDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleOpenCash} disabled={openCash.isPending || !operatorName || !openingBalance}>
                {openCash.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Abrir Caixa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cash Closing Dialog */}
        {openSession && (
          <SmartPOSCashClosing
            open={closeCashDialog}
            onOpenChange={setCloseCashDialog}
            session={openSession}
            summary={defaultSummary}
            deviceName={device?.device_name || 'Dispositivo'}
            operatorName={operatorName}
            companyName={companyName}
            printConfig={printerConfig}
            onPrint={handlePrint}
          />
        )}

        {/* Printer Settings Dialog */}
        {device && (
          <SmartPOSPrinterSettings
            open={printerSettingsOpen}
            onOpenChange={setPrinterSettingsOpen}
            device={device as unknown as SmartPOSDevice}
          />
        )}

        {/* Menu Dialog */}
        <Dialog open={showMenu} onOpenChange={setShowMenu}>
          <DialogContent className="max-w-md bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Menu</DialogTitle>
            </DialogHeader>
            <SmartPOSMenu
              onAction={(action) => {
                setShowMenu(false);
                switch (action) {
                  case 'comandas': setShowComandas(true); break;
                  case 'tables': setShowTables(true); break;
                  case 'history': setShowHistory(true); break;
                  case 'sales_search': setShowHistory(true); break;
                  case 'credit_receive': setShowCreditReceive(true); break;
                  case 'credit_launch': setShowCreditLaunch(true); break;
                  case 'customer_register': setShowCustomerForm(true); break;
                  case 'quick_sale': setShowProductSearch(true); break;
                  case 'cancel_item': 
                    if (cartItems.length > 0) {
                      setCartItems(prev => prev.slice(0, -1));
                      toast.success('Último item removido');
                    } else {
                      toast.info('Nenhum item no carrinho');
                    }
                    break;
                  case 'cancel_sale':
                    if (cartItems.length > 0) {
                      setCartItems([]);
                      toast.success('Venda cancelada');
                    } else {
                      toast.info('Nenhuma venda para cancelar');
                    }
                    break;
                  case 'reverse_sale':
                    setShowSaleReverse(true);
                    break;
                  case 'reprint_sale':
                  case 'reprint_fiscal':
                    setShowSaleReprint(true);
                    break;
                }
              }}
              openComandasCount={openComandas.length}
              openTablesCount={openTables.length}
              pendingCreditCount={customersWithCredit.length}
              hasPendingSale={cartItems.length > 0}
            />
          </DialogContent>
        </Dialog>

        {/* Comandas */}
        <SmartPOSComandas
          open={showComandas}
          onOpenChange={setShowComandas}
          comandas={openComandas}
        />

        {/* Tables */}
        <SmartPOSTables
          open={showTables}
          onOpenChange={setShowTables}
        />

        {/* Sales History */}
        <SmartPOSSalesHistory
          open={showHistory}
          onOpenChange={setShowHistory}
        />

        {/* Sale Reverse */}
        <SmartPOSSaleReverse
          open={showSaleReverse}
          onOpenChange={setShowSaleReverse}
        />

        {/* Sale Reprint */}
        <SmartPOSSaleReprint
          open={showSaleReprint}
          onOpenChange={setShowSaleReprint}
        />

        {/* Credit */}
        <SmartPOSCredit
          open={showCreditReceive}
          onOpenChange={setShowCreditReceive}
          mode="receive"
        />
        <SmartPOSCredit
          open={showCreditLaunch}
          onOpenChange={setShowCreditLaunch}
          mode="launch"
        />

        {/* Customer Form */}
        <SmartPOSCustomerForm
          open={showCustomerForm}
          onOpenChange={setShowCustomerForm}
        />

        {/* Product Search */}
        <SmartPOSProductSearch
          open={showProductSearch}
          onOpenChange={setShowProductSearch}
          onAddProduct={handleAddToCart}
        />
      </div>
    </div>
  );
}
