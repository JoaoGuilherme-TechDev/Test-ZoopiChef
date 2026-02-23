import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from '@/lib/supabase-shim';
import { ScaleTerminalTicketMode } from "@/components/scale-terminal/ScaleTerminalTicketMode";
import { ScaleTerminalAutoMode } from "@/components/scale-terminal/ScaleTerminalAutoMode";
import { Loader2 } from "lucide-react";

interface CompanyConfig {
  id: string;
  name: string;
  logo_url: string | null;
  selfservice_price_per_kg: number;
  selfservice_mode: "ticket" | "auto_launch";
  selfservice_product_name: string;
}

export default function ScaleTerminal() {
  const { token } = useParams<{ token: string }>();
  const [company, setCompany] = useState<CompanyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCompany() {
      if (!token) {
        setError("Token não fornecido");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("companies")
          .select("id, name, logo_url, selfservice_price_per_kg, selfservice_mode, selfservice_product_name, menu_token")
          .or(`menu_token.eq.${token}`)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Empresa não encontrada");
          setIsLoading(false);
          return;
        }

        setCompany({
          id: data.id,
          name: data.name,
          logo_url: data.logo_url,
          selfservice_price_per_kg: data.selfservice_price_per_kg || 5990,
          selfservice_mode: (data.selfservice_mode as "ticket" | "auto_launch") || "ticket",
          selfservice_product_name: data.selfservice_product_name || "Self-Service",
        });
      } catch (err) {
        console.error("Error loading company:", err);
        setError("Erro ao carregar configurações");
      } finally {
        setIsLoading(false);
      }
    }

    loadCompany();
  }, [token]);

  // Handle print ticket (for ticket mode)
  const handlePrintTicket = async (weight: number, valueCents: number, barcode: string) => {
    if (!company) return;

    // Save the entry (no comanda for ticket mode - just save for tracking)
    try {
      const { error } = await supabase
        .from("self_service_entries")
        .insert({
          company_id: company.id,
          comanda_id: null, // Ticket mode has no comanda
          product_name: company.selfservice_product_name,
          weight_kg: weight,
          price_per_kg: company.selfservice_price_per_kg,
          total_value: valueCents,
          barcode: barcode,
        });

      if (error) {
        console.error("Error saving entry:", error);
      }

      // Trigger print
      printTicket(weight, valueCents, barcode);
    } catch (err) {
      console.error("Error saving entry:", err);
    }
  };

  // Print ticket via browser
  const printTicket = (weight: number, valueCents: number, barcode: string) => {
    if (!company) return;

    const printWindow = window.open("", "_blank", "width=300,height=400");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket Self-Service</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              width: 80mm; 
              padding: 5mm;
              font-size: 12px;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .logo { max-height: 40px; margin-bottom: 5px; }
            .company-name { font-size: 16px; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .product { font-size: 14px; margin-bottom: 5px; }
            .weight { font-size: 24px; font-weight: bold; text-align: center; margin: 10px 0; }
            .value { font-size: 20px; font-weight: bold; text-align: center; margin: 10px 0; }
            .price-per-kg { font-size: 10px; text-align: center; color: #666; }
            .barcode { text-align: center; margin-top: 15px; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${company.logo_url ? `<img src="${company.logo_url}" class="logo" alt="${company.name}">` : ''}
            <div class="company-name">${company.name}</div>
          </div>
          <div class="divider"></div>
          <div class="product">${company.selfservice_product_name}</div>
          <div class="weight">${weight.toFixed(3)} kg</div>
          <div class="value">R$ ${(valueCents / 100).toFixed(2)}</div>
          <div class="price-per-kg">R$ ${(company.selfservice_price_per_kg / 100).toFixed(2)}/kg</div>
          <div class="divider"></div>
          <div class="barcode">
            <svg id="barcode"></svg>
          </div>
          <div class="footer">
            ${new Date().toLocaleString("pt-BR")}
          </div>
          <script>
            JsBarcode("#barcode", "${barcode}", {
              format: "CODE128",
              width: 2,
              height: 50,
              displayValue: true,
              fontSize: 12
            });
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Erro</h1>
          <p className="text-muted-foreground">{error || "Empresa não encontrada"}</p>
        </div>
      </div>
    );
  }

  // Render based on mode
  if (company.selfservice_mode === "auto_launch") {
    return (
      <ScaleTerminalAutoMode
        companyId={company.id}
        companyName={company.name}
        companyLogo={company.logo_url}
        pricePerKg={company.selfservice_price_per_kg}
        productName={company.selfservice_product_name}
      />
    );
  }

  return (
    <ScaleTerminalTicketMode
      companyName={company.name}
      companyLogo={company.logo_url}
      pricePerKg={company.selfservice_price_per_kg}
      productName={company.selfservice_product_name}
      onPrintTicket={handlePrintTicket}
    />
  );
}
