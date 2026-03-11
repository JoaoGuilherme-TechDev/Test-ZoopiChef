import { useState, useMemo } from "react";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Link as LinkIcon, 
  Smartphone, 
  Utensils, 
  Monitor,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { SystemLink, LinkCard } from "@/modules/my-links/components/LinkCard";
import { LinksHeader } from "@/modules/my-links/components/LinksHeader";



export default function MyLinks() {
  const { company } = useCompanyContext();
  const [isGenerating, setIsGenerating] = useState(false);

  // Base URL for the public catalog/menu
  const publicBaseUrl = window.location.origin;
  
  const companySlug = company?.slug || "empresa";
  const publicUrl = `${publicBaseUrl}/l/${companySlug}`;

  const systemLinks: SystemLink[] = useMemo(() => [
    {
      id: "catalog",
      name: "Cardápio Digital",
      description: "Link principal para seus clientes visualizarem e pedirem.",
      path: `/l/${companySlug}`,
      icon: Utensils,
      category: "customer"
    },
    {
      id: "tablet",
      name: "Menu para Tablet",
      description: "Interface otimizada para tablets em mesas.",
      path: `/tablet/${companySlug}`,
      icon: Smartphone,
      category: "internal"
    },
    {
      id: "totem",
      name: "Autoatendimento (Totem)",
      description: "Link para terminais de autoatendimento.",
      path: `/totem/${companySlug}`,
      icon: Monitor,
      category: "internal"
    },
    {
      id: "waiter",
      name: "App do Garçom",
      description: "Link para equipe de atendimento realizar pedidos.",
      path: `/waiter/${companySlug}`,
      icon: Smartphone,
      category: "internal"
    }
  ], [companySlug]);

  const handleGenerateLinks = () => {
    setIsGenerating(true);
    // Simulating generation logic
    setTimeout(() => {
      setIsGenerating(false);
      toast.success("Links atualizados com sucesso!");
    }, 1500);
  };

  return (
    <DashboardLayout title="Meus Links">
      <div className="flex flex-col gap-8 max-w-5xl mx-auto">
        
        <LinksHeader 
          companySlug={companySlug}
          publicUrl={publicUrl}
          logoUrl={company?.logo_url}
          isGenerating={isGenerating}
          onGenerateLinks={handleGenerateLinks}
        />

        {/* Links List Section */}
        <div className="grid grid-cols-1 gap-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" /> Canais Disponíveis
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemLinks.map((link) => (
              <LinkCard 
                key={link.id} 
                link={link} 
                publicBaseUrl={publicBaseUrl} 
              />
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-primary uppercase tracking-tight">Dica de Sucesso</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              O seu cardápio digital é a porta de entrada para seus clientes. Imprima o QR Code acima e coloque em lugares visíveis como mesas, balcões e materiais de entrega para aumentar suas vendas.
            </p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
