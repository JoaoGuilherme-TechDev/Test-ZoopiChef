import { useState, useEffect } from "react";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { supabase } from '@/lib/supabase-shim';
import { ScaleTerminalTicketMode } from "@/components/scale-terminal/ScaleTerminalTicketMode";
import { ScaleTerminalAutoMode } from "@/components/scale-terminal/ScaleTerminalAutoMode";
import { SelfServiceOperatorScreen } from "@/components/scale-terminal/SelfServiceOperatorScreen";
import { Loader2, Printer, ScanBarcode, PenLine, Settings, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ScaleConfig } from "@/hooks/useScaleConfig";

type OperationMode = "ticket" | "auto_launch" | "manual";

const MODE_OPTIONS: { value: OperationMode; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: "ticket",
    label: "Modo Ticket",
    description: "Imprime ticket com código de barras para apresentar no caixa",
    icon: Printer,
  },
  {
    value: "auto_launch",
    label: "Lançamento Automático",
    description: "Cliente passa a comanda após pesar, sistema lança automaticamente",
    icon: ScanBarcode,
  },
  {
    value: "manual",
    label: "Lançamento Manual",
    description: "Operador digita o peso e escaneia a comanda para lançar",
    icon: PenLine,
  },
];

function BalancaContent() {
  const { company } = useTenant();
  const [scaleConfig, setScaleConfig] = useState<ScaleConfig | null>(null);
  const [selectedMode, setSelectedMode] = useState<OperationMode | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Derived company config values
  const companyConfig = company ? {
    id: company.id,
    name: company.name,
    logo_url: company.logo_url,
    selfservice_price_per_kg: company.selfservice_price_per_kg || 0,
    selfservice_mode: company.selfservice_mode || "ticket",
    selfservice_product_name: company.selfservice_product_name || "Produto Self-Service",
  } : null;

  useEffect(() => {
    async function loadScaleConfig() {
      if (!company?.id) {
        setIsLoadingConfig(false);
        return;
      }

      try {
        // Fetch active scale config for this company
        const { data: scaleData, error: scaleError } = await (supabase as any)
          .from("scale_config")
          .select("*")
          .eq("company_id", company.id)
          .eq("active", true)
          .maybeSingle();

        if (!scaleError && scaleData) {
          setScaleConfig(scaleData as ScaleConfig);
          console.log("Scale config loaded:", scaleData);
        }
      } catch (err) {
        console.error("Error loading scale config:", err);
      } finally {
        setIsLoadingConfig(false);
      }
    }

    loadScaleConfig();
  }, [company?.id]);

  const handlePrintTicket = async (weight: number, valueCents: number, barcode: string) => {
    if (!companyConfig) return;

    try {
      await supabase
        .from("self_service_entries")
        .insert({
          company_id: companyConfig.id,
          comanda_id: null,
          product_name: companyConfig.selfservice_product_name,
          weight_kg: weight,
          price_per_kg: companyConfig.selfservice_price_per_kg,
          total_value: valueCents,
          barcode: barcode,
        });
    } catch (err) {
      console.error("Error saving entry:", err);
    }
  };

  const handleSelectMode = (mode: OperationMode) => {
    setSelectedMode(mode);
    setShowModeSelector(false);
  };

  const handleBackToSelector = () => {
    setShowModeSelector(true);
    setSelectedMode(null);
  };

  if (!company || isLoadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!companyConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive text-xl font-semibold">
            Empresa não encontrada
          </p>
          <p className="text-muted-foreground mt-2">
            Verifique o link e tente novamente
          </p>
        </div>
      </div>
    );
  }

  // Mode selector screen
  if (showModeSelector) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 flex items-center justify-center">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center">
            {companyConfig.logo_url ? (
              <img 
                src={companyConfig.logo_url} 
                alt={companyConfig.name} 
                className="h-16 mx-auto mb-4 object-contain"
              />
            ) : (
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Scale className="w-10 h-10 text-amber-600" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">{companyConfig.name}</h1>
            <p className="text-muted-foreground mt-1">Selecione o modo de operação</p>
          </div>

          {/* Mode Cards */}
          <div className="grid gap-4">
            {MODE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isDefault = companyConfig.selfservice_mode === option.value;
              
              return (
                <Card 
                  key={option.value}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 ${
                    isDefault ? "border-primary/30 bg-primary/5" : ""
                  }`}
                  onClick={() => handleSelectMode(option.value)}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      isDefault 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{option.label}</h3>
                        {isDefault && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer info */}
          <p className="text-center text-xs text-muted-foreground">
            Preço: R$ {(companyConfig.selfservice_price_per_kg / 100).toFixed(2)}/kg • {companyConfig.selfservice_product_name}
          </p>
        </div>
      </div>
    );
  }

  // Render selected mode
  const renderTerminal = () => {
    const mode = selectedMode || companyConfig.selfservice_mode;

    if (mode === "auto_launch") {
      return (
        <ScaleTerminalAutoMode
          companyId={companyConfig.id}
          companyName={companyConfig.name}
          companyLogo={companyConfig.logo_url}
          pricePerKg={companyConfig.selfservice_price_per_kg}
          productName={companyConfig.selfservice_product_name}
          scaleConfig={scaleConfig}
        />
      );
    }

    if (mode === "manual") {
      return (
        <SelfServiceOperatorScreen
          companyId={companyConfig.id}
          pricePerKgCents={companyConfig.selfservice_price_per_kg}
          productName={companyConfig.selfservice_product_name}
          scaleConfig={scaleConfig}
          onChangeMode={handleBackToSelector}
        />
      );
    }

    return (
      <ScaleTerminalTicketMode
        companyName={companyConfig.name}
        companyLogo={companyConfig.logo_url}
        pricePerKg={companyConfig.selfservice_price_per_kg}
        productName={companyConfig.selfservice_product_name}
        onPrintTicket={handlePrintTicket}
        scaleConfig={scaleConfig}
      />
    );
  };

  // Manual mode has its own change mode button
  const mode = selectedMode || companyConfig.selfservice_mode;
  if (mode === "manual") {
    return renderTerminal();
  }

  return (
    <div className="relative">
      {/* Back to mode selector button */}
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 left-4 z-50 gap-2 bg-background/80 backdrop-blur-sm"
        onClick={handleBackToSelector}
      >
        <Settings className="w-4 h-4" />
        Trocar Modo
      </Button>

      {renderTerminal()}
    </div>
  );
}

export default function TenantBalanca() {
  return (
    <TenantProvider>
      <BalancaContent />
    </TenantProvider>
  );
}
