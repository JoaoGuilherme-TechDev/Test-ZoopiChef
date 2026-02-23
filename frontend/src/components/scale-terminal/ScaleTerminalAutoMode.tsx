import { useState, useEffect, useCallback, useRef } from "react";
import { useScaleConnection } from "@/hooks/useScaleConnection";
import { formatCurrency } from "@/lib/format";
import { Scale, ScanBarcode, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from '@/lib/supabase-shim';
import { toast } from "sonner";
import type { ScaleConfig } from "@/hooks/useScaleConfig";

interface ScaleTerminalAutoModeProps {
  companyId: string;
  companyName: string;
  companyLogo?: string | null;
  pricePerKg: number; // in cents
  productName: string;
  scaleConfig?: ScaleConfig | null;
}

type TerminalState = "waiting" | "weighing" | "scan_comanda" | "launching" | "remove_plate" | "thankyou" | "error";

export function ScaleTerminalAutoMode({
  companyId,
  companyName,
  companyLogo,
  pricePerKg,
  productName,
  scaleConfig,
}: ScaleTerminalAutoModeProps) {
  const { weight, stable, isConnected, connect } = useScaleConnection({ config: scaleConfig });
  const [state, setState] = useState<TerminalState>("waiting");
  const [capturedWeight, setCapturedWeight] = useState(0);
  const [capturedValue, setCapturedValue] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [comandaCode, setComandaCode] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef("");
  const barcodeTimeout = useRef<NodeJS.Timeout>();

  // Minimum weight to consider a plate is on the scale (100g)
  const MIN_WEIGHT = 0.1;
  const STABILITY_TIMEOUT = 1500;

  // Auto-connect scale on mount
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  // Focus barcode input when waiting for scan
  useEffect(() => {
    if (state === "scan_comanda" && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [state]);

  // Handle barcode scanner input (keyboard events)
  useEffect(() => {
    if (state !== "scan_comanda") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Clear timeout on each keystroke
      if (barcodeTimeout.current) {
        clearTimeout(barcodeTimeout.current);
      }

      // Enter key = barcode complete
      if (e.key === "Enter" && barcodeBuffer.current.length > 0) {
        processBarcode(barcodeBuffer.current);
        barcodeBuffer.current = "";
        return;
      }

      // Append printable characters
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }

      // Timeout to process barcode if no Enter is received
      barcodeTimeout.current = setTimeout(() => {
        if (barcodeBuffer.current.length >= 3) {
          processBarcode(barcodeBuffer.current);
        }
        barcodeBuffer.current = "";
      }, 100);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (barcodeTimeout.current) {
        clearTimeout(barcodeTimeout.current);
      }
    };
  }, [state]);

  // Process scanned barcode
  const processBarcode = async (code: string) => {
    setComandaCode(code);
    setState("launching");

    try {
      // Find comanda by command_number
      const { data: comanda, error: comandaError } = await supabase
        .from("comandas")
        .select("id, command_number, status")
        .eq("company_id", companyId)
        .eq("command_number", parseInt(code.trim()) || 0)
        .eq("status", "open")
        .maybeSingle();

      if (comandaError) throw comandaError;

      if (!comanda) {
        setErrorMessage(`Comanda "${code}" não encontrada ou não está aberta`);
        setState("error");
        setTimeout(() => {
          setState("waiting");
          setErrorMessage("");
          setCapturedWeight(0);
          setCapturedValue(0);
        }, 4000);
        return;
      }

      // Create self-service entry
      const { error: entryError } = await supabase
        .from("self_service_entries")
        .insert({
          company_id: companyId,
          comanda_id: comanda.id,
          product_name: productName,
          weight_kg: capturedWeight,
          price_per_kg: pricePerKg,
          total_value: capturedValue,
        });

      if (entryError) throw entryError;

      toast.success(`${capturedWeight.toFixed(3)}kg lançado na comanda ${comanda.command_number}`);
      setState("remove_plate");

      // Show remove plate message
      setTimeout(() => {
        setState("thankyou");
        // Reset after 3 seconds
        setTimeout(() => {
          setState("waiting");
          setCapturedWeight(0);
          setCapturedValue(0);
          setComandaCode("");
        }, 3000);
      }, 2000);

    } catch (error) {
      console.error("Error launching weight:", error);
      setErrorMessage("Erro ao lançar peso. Tente novamente.");
      setState("error");
      setTimeout(() => {
        setState("waiting");
        setErrorMessage("");
        setCapturedWeight(0);
        setCapturedValue(0);
      }, 4000);
    }
  };

  // State machine for weight detection
  useEffect(() => {
    if (!isConnected) return;

    if (state === "waiting") {
      // Detect when plate is placed
      if (weight >= MIN_WEIGHT && stable) {
        setState("weighing");
      }
    } else if (state === "weighing") {
      // Wait for stable weight and capture
      if (stable && weight >= MIN_WEIGHT) {
        const timer = setTimeout(() => {
          const value = (weight * pricePerKg); // pricePerKg is in cents, value in cents
          setCapturedWeight(weight);
          setCapturedValue(value);
          setState("scan_comanda");
        }, STABILITY_TIMEOUT);
        
        return () => clearTimeout(timer);
      }
    }
  }, [weight, stable, state, isConnected, pricePerKg]);

  // Reset if weight goes to zero during weighing
  useEffect(() => {
    if ((state === "weighing" || state === "scan_comanda") && weight < MIN_WEIGHT) {
      setState("waiting");
      setCapturedWeight(0);
      setCapturedValue(0);
    }
  }, [weight, state]);

  const renderContent = () => {
    switch (state) {
      case "waiting":
        return (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <Scale className="w-32 h-32 text-primary/60 mb-8 animate-pulse" />
            <h1 className="text-5xl font-display font-bold text-foreground mb-4">
              Coloque seu prato!
            </h1>
            <p className="text-2xl text-muted-foreground">
              Posicione o prato na balança
            </p>
            {!isConnected && (
              <button
                onClick={connect}
                className="mt-8 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Conectar Balança
              </button>
            )}
          </div>
        );

      case "weighing":
        return (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <Scale className="w-24 h-24 text-primary mb-6" />
            <p className="text-2xl text-muted-foreground mb-4">Pesando...</p>
            <div className="text-7xl font-mono font-bold text-primary">
              {weight.toFixed(3)} kg
            </div>
            <p className="text-3xl text-foreground mt-4">
              {formatCurrency((weight * pricePerKg) / 100)}
            </p>
          </div>
        );

      case "scan_comanda":
        return (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <ScanBarcode className="w-32 h-32 text-primary mb-8 animate-pulse" />
            <h1 className="text-5xl font-display font-bold text-foreground mb-4">
              Passe a Comanda
            </h1>
            <p className="text-2xl text-muted-foreground mb-8">
              no leitor de código de barras
            </p>
            
            {/* Weight and value display */}
            <div className="bg-card border border-border rounded-2xl p-8 mb-8">
              <div className="text-5xl font-mono font-bold text-primary mb-2">
                {capturedWeight.toFixed(3)} kg
              </div>
              <div className="text-3xl font-bold text-foreground">
                {formatCurrency(capturedValue / 100)}
              </div>
            </div>

            {/* Hidden input for barcode scanner */}
            <input
              ref={barcodeInputRef}
              type="text"
              className="opacity-0 absolute"
              autoFocus
              onBlur={() => barcodeInputRef.current?.focus()}
            />
          </div>
        );

      case "launching":
        return (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-8" />
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Lançando...
            </h1>
            <p className="text-2xl text-muted-foreground">
              Comanda: {comandaCode}
            </p>
          </div>
        );

      case "remove_plate":
        return (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <Scale className="w-32 h-32 text-amber-500 mb-8" />
            <h1 className="text-5xl font-display font-bold text-foreground mb-4">
              Retire seu prato!
            </h1>
            <p className="text-2xl text-muted-foreground">
              {capturedWeight.toFixed(3)}kg lançado com sucesso
            </p>
          </div>
        );

      case "thankyou":
        return (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <CheckCircle2 className="w-32 h-32 text-green-500 mb-8" />
            <h1 className="text-5xl font-display font-bold text-foreground mb-4">
              Obrigado!
            </h1>
            <p className="text-3xl text-muted-foreground">
              Bom apetite! 🍽️
            </p>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <AlertCircle className="w-32 h-32 text-destructive mb-8" />
            <h1 className="text-4xl font-display font-bold text-destructive mb-4">
              Erro
            </h1>
            <p className="text-2xl text-muted-foreground">
              {errorMessage}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      "bg-gradient-to-br from-background via-background to-muted/30"
    )}>
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-4">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName} className="h-12" />
          ) : (
            <Scale className="w-10 h-10 text-primary" />
          )}
          <h1 className="text-2xl font-display font-bold">{companyName}</h1>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
          isConnected 
            ? "bg-green-500/10 text-green-600" 
            : "bg-red-500/10 text-red-600"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          {isConnected ? "Balança Conectada" : "Desconectada"}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-muted-foreground border-t border-border/50">
        <p className="text-lg">
          Preço: <span className="font-bold text-foreground">{formatCurrency(pricePerKg / 100)}/kg</span>
          <span className="mx-4">•</span>
          Modo: <span className="font-bold text-foreground">Lançamento Automático</span>
        </p>
      </footer>
    </div>
  );
}
