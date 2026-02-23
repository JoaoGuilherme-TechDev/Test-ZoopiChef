import { useState, useEffect, useCallback } from "react";
import { useScaleConnection } from "@/hooks/useScaleConnection";
import { formatCurrency } from "@/lib/format";
import { Scale, Printer, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Barcode from "react-barcode";
import type { ScaleConfig } from "@/hooks/useScaleConfig";

interface ScaleTerminalTicketModeProps {
  companyName: string;
  companyLogo?: string | null;
  pricePerKg: number; // in cents
  productName: string;
  scaleConfig?: ScaleConfig | null;
  onPrintTicket?: (weight: number, value: number, barcode: string) => void;
}

type TerminalState = "waiting" | "weighing" | "printing" | "thankyou";

export function ScaleTerminalTicketMode({
  companyName,
  companyLogo,
  pricePerKg,
  productName,
  scaleConfig,
  onPrintTicket,
}: ScaleTerminalTicketModeProps) {
  const { weight, stable, isConnected, connect } = useScaleConnection({ config: scaleConfig });
  const [state, setState] = useState<TerminalState>("waiting");
  const [capturedWeight, setCapturedWeight] = useState(0);
  const [capturedValue, setCapturedValue] = useState(0);
  const [barcode, setBarcode] = useState("");

  // Minimum weight to consider a plate is on the scale (100g)
  const MIN_WEIGHT = 0.1;
  
  // Weight stability timeout
  const STABILITY_TIMEOUT = 1500;

  // Generate barcode with weight and value
  const generateBarcode = useCallback((w: number, v: number): string => {
    // Format: 2 + weight(5 digits, 3 decimals) + value(6 digits, 2 decimals)
    // Example: 2 00500 002995 = 0.500kg, R$ 29.95
    const weightCode = Math.round(w * 1000).toString().padStart(5, "0");
    const valueCode = Math.round(v).toString().padStart(6, "0");
    return `2${weightCode}${valueCode}`;
  }, []);

  // Auto-connect scale on mount
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

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
          // Value in cents: weight * pricePerKg (pricePerKg is already in cents)
          const valueCents = Math.round(weight * pricePerKg);
          const code = generateBarcode(weight, valueCents);
          
          setCapturedWeight(weight);
          setCapturedValue(valueCents);
          setBarcode(code);
          setState("printing");
          
          // Trigger print (value in cents)
          onPrintTicket?.(weight, valueCents, code);
          
          // Move to thank you after 2 seconds
          setTimeout(() => {
            setState("thankyou");
            // Reset after 3 seconds
            setTimeout(() => {
              setState("waiting");
              setCapturedWeight(0);
              setCapturedValue(0);
              setBarcode("");
            }, 3000);
          }, 2000);
        }, STABILITY_TIMEOUT);
        
        return () => clearTimeout(timer);
      }
    }
  }, [weight, stable, state, isConnected, pricePerKg, generateBarcode, onPrintTicket]);

  // Reset if weight goes to zero during weighing
  useEffect(() => {
    if (state === "weighing" && weight < MIN_WEIGHT) {
      setState("waiting");
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

      case "printing":
        return (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              {/* Ticket Preview */}
              <div className="text-center mb-6">
                {companyLogo && (
                  <img src={companyLogo} alt={companyName} className="h-16 mx-auto mb-4" />
                )}
                <h2 className="text-2xl font-bold text-gray-900">{companyName}</h2>
              </div>
              
              <div className="border-t border-b border-dashed border-gray-300 py-4 my-4">
                <p className="text-xl text-gray-700 mb-2">{productName}</p>
                <p className="text-4xl font-mono font-bold text-gray-900">
                  {capturedWeight.toFixed(3)} kg
                </p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {formatCurrency(capturedValue / 100)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(pricePerKg / 100)}/kg
                </p>
              </div>
              
              {barcode && (
                <div className="flex justify-center">
                  <Barcode 
                    value={barcode} 
                    width={2} 
                    height={60} 
                    fontSize={14}
                    displayValue={true}
                  />
                </div>
              )}
            </div>
            
            <div className="mt-8 flex items-center gap-3 text-primary">
              <Printer className="w-8 h-8 animate-pulse" />
              <span className="text-2xl">Aguarde seu ticket...</span>
            </div>
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
        </p>
      </footer>
    </div>
  );
}
