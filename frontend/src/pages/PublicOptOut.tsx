import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from '@/lib/supabase-shim';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Mail, Phone } from "lucide-react";

export default function PublicOptOut() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");
  const [customerName, setCustomerName] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");

  const customerId = searchParams.get("c");
  const companyId = searchParams.get("e");
  const channel = searchParams.get("ch") || "whatsapp";

  useEffect(() => {
    const processOptOut = async () => {
      if (!customerId || !companyId) {
        setStatus("error");
        return;
      }

      try {
        // Buscar informações do cliente e empresa
        const [{ data: customer }, { data: company }] = await Promise.all([
          supabase
            .from("customers")
            .select("name")
            .eq("id", customerId)
            .single(),
          supabase
            .from("companies")
            .select("name")
            .eq("id", companyId)
            .single(),
        ]);

        if (customer?.name) setCustomerName(customer.name);
        if (company?.name) setCompanyName(company.name);

        // Verificar se já existe opt-out
        const { data: existingOptOut } = await supabase
          .from("campaign_opt_outs")
          .select("id")
          .eq("customer_id", customerId)
          .eq("company_id", companyId)
          .eq("channel", channel)
          .maybeSingle();

        if (existingOptOut) {
          setStatus("already");
          return;
        }

        // Registrar opt-out
        const { error } = await supabase
          .from("campaign_opt_outs")
          .insert({
            customer_id: customerId,
            company_id: companyId,
            channel: channel,
            reason: "Cliente solicitou descadastramento via link",
          });

        if (error) {
          console.error("Erro ao registrar opt-out:", error);
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch (err) {
        console.error("Erro ao processar opt-out:", err);
        setStatus("error");
      }
    };

    processOptOut();
  }, [customerId, companyId, channel]);

  const getChannelLabel = () => {
    switch (channel) {
      case "whatsapp":
        return "WhatsApp";
      case "sms":
        return "SMS";
      case "email":
        return "E-mail";
      default:
        return "mensagens de marketing";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <CardTitle className="mt-4">Processando...</CardTitle>
              <CardDescription>
                Aguarde enquanto processamos sua solicitação
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <CardTitle className="mt-4 text-green-700">Descadastramento Confirmado</CardTitle>
              <CardDescription>
                {customerName ? `${customerName}, você` : "Você"} foi removido(a) com sucesso da nossa lista de {getChannelLabel()}
                {companyName && ` do(a) ${companyName}`}.
              </CardDescription>
            </>
          )}

          {status === "already" && (
            <>
              <CheckCircle className="h-16 w-16 mx-auto text-blue-500" />
              <CardTitle className="mt-4 text-blue-700">Já Descadastrado</CardTitle>
              <CardDescription>
                {customerName ? `${customerName}, você` : "Você"} já está descadastrado(a) da nossa lista de {getChannelLabel()}
                {companyName && ` do(a) ${companyName}`}.
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
              <CardTitle className="mt-4 text-destructive">Erro no Processamento</CardTitle>
              <CardDescription>
                Não foi possível processar sua solicitação. O link pode estar inválido ou expirado.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {(status === "success" || status === "already") && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Você não receberá mais mensagens promocionais via {getChannelLabel()}.</p>
              <p className="mt-2">
                Se mudar de ideia, entre em contato conosco para voltar a receber nossas novidades.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Por favor, entre em contato diretamente com o estabelecimento para solicitar o descadastramento.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" size="sm" onClick={() => window.close()}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
