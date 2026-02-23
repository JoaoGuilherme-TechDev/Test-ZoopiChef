import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import { useCompany, Company } from "./useCompany";
import { toast } from "sonner";

export interface WhatsAppTemplate {
  id: string;
  company_id: string;
  template_type: string;
  template_name: string;
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos de template disponíveis com mensagens padrão
export const TEMPLATE_TYPES = {
  welcome: {
    name: "Boas-vindas",
    description: "Quando cliente entra em contato",
    defaultMessage: "Olá {{nome_cliente}}! 👋 Bem-vindo(a) à {{nome_empresa}}! Acesse nosso cardápio: {{link_cardapio}}",
  },
  order_received: {
    name: "Pedido Recebido",
    description: "Quando pedido é criado",
    defaultMessage: "✅ {{nome_cliente}}, recebemos seu pedido #{{numero_pedido}}! Total: R$ {{total_pedido}}. Vamos preparar com carinho!",
  },
  order_preparing: {
    name: "Em Preparo",
    description: "Quando pedido entra em preparo",
    defaultMessage: "🍳 {{nome_cliente}}, seu pedido #{{numero_pedido}} está sendo preparado! Logo logo estará pronto.",
  },
  order_dispatched: {
    name: "Pedido Despachado",
    description: "Quando pedido sai para entrega",
    defaultMessage: "🛵 {{nome_cliente}}, seu pedido #{{numero_pedido}} saiu para entrega! Em breve chegará até você.",
  },
  order_delivered: {
    name: "Pedido Entregue",
    description: "Quando pedido é entregue",
    defaultMessage: "🎉 {{nome_cliente}}, seu pedido #{{numero_pedido}} foi entregue! Obrigado pela preferência. 💜",
  },
  review_request: {
    name: "Avaliação",
    description: "Solicitar avaliação após entrega",
    defaultMessage: "⭐ {{nome_cliente}}, como foi sua experiência com a {{nome_empresa}}? Adoraríamos saber! Avalie: {{link_avaliacao}}",
  },
  birthday: {
    name: "Aniversário",
    description: "Mensagem de aniversário",
    defaultMessage: "🎂 Parabéns {{nome_cliente}}! A {{nome_empresa}} deseja um feliz aniversário! 🎁 Temos um presente especial para você!",
  },
  promotion: {
    name: "Promoção",
    description: "Ofertas e promoções",
    defaultMessage: "🔥 {{nome_cliente}}, temos uma promoção especial para você! {{promocao}} Peça agora: {{link_cardapio}}",
  },
  menu_link: {
    name: "Link Cardápio",
    description: "Envio do link do cardápio",
    defaultMessage: "📋 {{nome_cliente}}, aqui está nosso cardápio: {{link_cardapio}} Faça seu pedido agora!",
  },
} as const;

// Variáveis disponíveis para personalização
export const TEMPLATE_VARIABLES = [
  { key: "{{nome_empresa}}", description: "Nome da empresa" },
  { key: "{{nome_cliente}}", description: "Nome do cliente" },
  { key: "{{numero_pedido}}", description: "Número do pedido" },
  { key: "{{total_pedido}}", description: "Valor total do pedido" },
  { key: "{{link_cardapio}}", description: "Link do cardápio online" },
  { key: "{{link_avaliacao}}", description: "Link para avaliação" },
  { key: "{{promocao}}", description: "Descrição da promoção" },
  { key: "{{data_aniversario}}", description: "Data de aniversário" },
];

export const useWhatsAppTemplates = () => {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["whatsapp-templates", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("whatsapp_message_templates")
        .select("*")
        .eq("company_id", company.id)
        .order("template_type");

      if (error) throw error;
      return data as WhatsAppTemplate[];
    },
    enabled: !!company?.id,
  });

  const upsertTemplate = useMutation({
    mutationFn: async (template: Partial<WhatsAppTemplate> & { template_type: string }) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("whatsapp_message_templates")
        .upsert({
          company_id: company.id,
          template_type: template.template_type,
          template_name: template.template_name || TEMPLATE_TYPES[template.template_type as keyof typeof TEMPLATE_TYPES]?.name || template.template_type,
          message_template: template.message_template || "",
          is_active: template.is_active ?? true,
        }, {
          onConflict: "company_id,template_type",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template salvo!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar template: " + error.message);
    },
  });

  const toggleTemplate = useMutation({
    mutationFn: async ({ templateType, isActive }: { templateType: string; isActive: boolean }) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const { error } = await supabase
        .from("whatsapp_message_templates")
        .update({ is_active: isActive })
        .eq("company_id", company.id)
        .eq("template_type", templateType);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
  });

  // Função para obter template ou usar padrão
  const getTemplate = (templateType: keyof typeof TEMPLATE_TYPES) => {
    const saved = templates.find(t => t.template_type === templateType);
    if (saved) return saved;
    
    return {
      id: "",
      company_id: company?.id || "",
      template_type: templateType,
      template_name: TEMPLATE_TYPES[templateType].name,
      message_template: TEMPLATE_TYPES[templateType].defaultMessage,
      is_active: true,
      created_at: "",
      updated_at: "",
    } as WhatsAppTemplate;
  };

  return {
    templates,
    isLoading,
    upsertTemplate,
    toggleTemplate,
    getTemplate,
    TEMPLATE_TYPES,
    TEMPLATE_VARIABLES,
  };
};
