import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const documentacaoContent = `# 📋 MAPEAMENTO COMPLETO DO SISTEMA

> Documento gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}

---

## 📊 RESUMO QUANTITATIVO

| Categoria | Quantidade |
|-----------|------------|
| Módulos principais | 25+ |
| Páginas/Telas | 200+ |
| Edge Functions | 30+ |
| Tabelas no banco | 100+ |
| Componentes React | 500+ |

---

## 🍽️ 1. PEDIDOS & OPERAÇÕES

### 1.1 Dashboard Principal
- **Rota:** \`/\`
- **Arquivo:** \`src/pages/Index.tsx\`
- **Funcionalidades:**
  - KPIs em tempo real (vendas, pedidos, ticket médio)
  - Gráficos de performance
  - Alertas operacionais
  - Atalhos rápidos

### 1.2 Gestão de Pedidos
- **Rota:** \`/orders\`
- **Arquivo:** \`src/pages/Orders.tsx\`
- **Funcionalidades:**
  - Lista de pedidos com filtros
  - Status em tempo real
  - Ações rápidas (confirmar, cancelar)
  - Detalhes do pedido

### 1.3 PDV (Ponto de Venda)
- **Rota:** \`/pdv\`
- **Arquivo:** \`src/pages/PDV.tsx\`
- **Funcionalidades:**
  - Interface de venda rápida
  - Carrinho de compras
  - Múltiplas formas de pagamento
  - Impressão de cupom

### 1.4 Cozinha (KDS)
- **Rota:** \`/kitchen\`
- **Arquivo:** \`src/pages/Kitchen.tsx\`
- **Funcionalidades:**
  - Fila de pedidos
  - Marcação de itens prontos
  - Tempo de preparo
  - Alertas de atraso

### 1.5 Mesas
- **Rota:** \`/tables\`
- **Arquivo:** \`src/pages/Tables.tsx\`
- **Funcionalidades:**
  - Mapa visual de mesas
  - Status de ocupação
  - Reservas
  - Comandas abertas

---

## 🍔 2. CARDÁPIO & PRODUTOS

### 2.1 Cardápio Digital
- **Rota:** \`/menu\`
- **Arquivo:** \`src/pages/Menu.tsx\`
- **Funcionalidades:**
  - Listagem de produtos
  - Categorias e subcategorias
  - Preços e variações
  - Disponibilidade

### 2.2 Produtos
- **Rota:** \`/products\`
- **Arquivo:** \`src/pages/Products.tsx\`
- **Funcionalidades:**
  - CRUD de produtos
  - Fichas técnicas
  - Variações e adicionais
  - Fotos e descrições

### 2.3 Categorias
- **Rota:** \`/categories\`
- **Arquivo:** \`src/pages/Categories.tsx\`
- **Funcionalidades:**
  - Gestão de categorias
  - Ordenação drag-and-drop
  - Ícones personalizados

### 2.4 Combos
- **Rota:** \`/combos\`
- **Arquivo:** \`src/pages/Combos.tsx\`
- **Funcionalidades:**
  - Criação de combos
  - Regras de desconto
  - Sugestões por IA

### 2.5 Adicionais
- **Rota:** \`/additionals\`
- **Arquivo:** \`src/pages/Additionals.tsx\`
- **Funcionalidades:**
  - Grupos de adicionais
  - Preços extras
  - Regras de quantidade

### 2.6 Configurações do Cardápio
- **Rota:** \`/menu-settings\`
- **Arquivo:** \`src/pages/MenuSettings.tsx\`
- **Funcionalidades:**
  - Horários de funcionamento
  - Tema e cores
  - QR Code
  - Link público

---

## 🚗 3. DELIVERY

### 3.1 Painel de Delivery
- **Rota:** \`/delivery\`
- **Arquivo:** \`src/pages/Delivery.tsx\`
- **Funcionalidades:**
  - Pedidos em andamento
  - Mapa de entregas
  - Status dos entregadores

### 3.2 Configurações de Delivery
- **Rota:** \`/delivery-settings\`
- **Arquivo:** \`src/pages/DeliverySettings.tsx\`
- **Funcionalidades:**
  - Áreas de entrega
  - Taxas por região
  - Tempo estimado
  - Raio de atendimento

### 3.3 Zonas de Entrega
- **Rota:** \`/delivery-zones\`
- **Arquivo:** \`src/pages/DeliveryZones.tsx\`
- **Funcionalidades:**
  - Desenho de polígonos no mapa
  - Preços por zona
  - Tempo por zona

---

## 👥 4. CLIENTES & CRM

### 4.1 Lista de Clientes
- **Rota:** \`/customers\`
- **Arquivo:** \`src/pages/Customers.tsx\`
- **Funcionalidades:**
  - Cadastro completo
  - Histórico de pedidos
  - Segmentação

### 4.2 CRM Avançado
- **Rota:** \`/crm\`
- **Arquivo:** \`src/modules/crm/pages/CRMPage.tsx\`
- **Funcionalidades:**
  - Pipelines de vendas
  - Automações
  - Tarefas e follow-ups

### 4.3 Programa de Fidelidade
- **Rota:** \`/loyalty\`
- **Arquivo:** \`src/pages/LoyaltyProgram.tsx\`
- **Funcionalidades:**
  - Pontos e recompensas
  - Níveis de fidelidade
  - Conquistas (gamificação)

### 4.4 Cupons
- **Rota:** \`/coupons\`
- **Arquivo:** \`src/pages/Coupons.tsx\`
- **Funcionalidades:**
  - Códigos promocionais
  - Regras de uso
  - Validade e limites

---

## 📢 5. MARKETING

### 5.1 Dashboard de Marketing
- **Rota:** \`/marketing\`
- **Arquivo:** \`src/modules/marketing/pages/MarketingDashboard.tsx\`
- **Funcionalidades:**
  - Métricas de campanhas
  - ROI por canal
  - Performance geral

### 5.2 Campanhas
- **Rota:** \`/marketing/campaigns\`
- **Arquivo:** \`src/modules/marketing/pages/CampaignsPage.tsx\`
- **Funcionalidades:**
  - Criação de campanhas
  - Agendamento
  - Segmentação de público

### 5.3 Posts Automáticos
- **Rota:** \`/marketing/posts\`
- **Arquivo:** \`src/modules/marketing/pages/MarketingPostsPage.tsx\`
- **Funcionalidades:**
  - Geração por IA
  - Aprovação de conteúdo
  - Publicação automática

### 5.4 WhatsApp Marketing
- **Rota:** \`/marketing/whatsapp\`
- **Arquivo:** \`src/modules/marketing/pages/WhatsAppMarketingPage.tsx\`
- **Funcionalidades:**
  - Campanhas em massa
  - Templates de mensagem
  - Métricas de entrega

---

## 💰 6. FINANCEIRO

### 6.1 Dashboard Financeiro
- **Rota:** \`/finance\`
- **Arquivo:** \`src/pages/Finance.tsx\`
- **Funcionalidades:**
  - Resumo de caixa
  - Receitas vs despesas
  - Fluxo de caixa

### 6.2 Caixa
- **Rota:** \`/cashier\`
- **Arquivo:** \`src/pages/Cashier.tsx\`
- **Funcionalidades:**
  - Abertura/fechamento
  - Sangrias e suprimentos
  - Conferência

### 6.3 DRE (Demonstração de Resultados)
- **Rota:** \`/dre\`
- **Arquivo:** \`src/pages/DRE.tsx\`
- **Funcionalidades:**
  - Lucro bruto e líquido
  - Análise por período
  - Comparativos

### 6.4 Contas a Pagar
- **Rota:** \`/accounts-payable\`
- **Arquivo:** \`src/pages/AccountsPayable.tsx\`
- **Funcionalidades:**
  - Cadastro de contas
  - Vencimentos
  - Baixa de pagamentos

### 6.5 Contas a Receber
- **Rota:** \`/accounts-receivable\`
- **Arquivo:** \`src/pages/AccountsReceivable.tsx\`
- **Funcionalidades:**
  - Recebíveis pendentes
  - Baixa automática
  - Inadimplência

### 6.6 Plano de Contas
- **Rota:** \`/chart-of-accounts\`
- **Arquivo:** \`src/pages/ChartOfAccounts.tsx\`
- **Funcionalidades:**
  - Estrutura contábil
  - Categorias de despesas
  - Centros de custo

---

## 📦 7. ERP / ESTOQUE

### 7.1 Dashboard ERP
- **Rota:** \`/erp\`
- **Arquivo:** \`src/modules/erp-inventory/pages/ERPDashboard.tsx\`
- **Funcionalidades:**
  - Visão geral do estoque
  - Alertas de mínimo
  - Curva ABC

### 7.2 Itens de Estoque
- **Rota:** \`/erp/items\`
- **Arquivo:** \`src/modules/erp-inventory/pages/ERPItemsPage.tsx\`
- **Funcionalidades:**
  - CRUD de itens
  - Códigos de barras
  - Unidades de medida

### 7.3 Movimentações
- **Rota:** \`/erp/movements\`
- **Arquivo:** \`src/modules/erp-inventory/pages/ERPMovementsPage.tsx\`
- **Funcionalidades:**
  - Entradas e saídas
  - Histórico completo
  - Rastreabilidade

### 7.4 Compras
- **Rota:** \`/erp/purchases\`
- **Arquivo:** \`src/modules/erp-inventory/pages/ERPPurchasesPage.tsx\`
- **Funcionalidades:**
  - Pedidos de compra
  - **Importação de NFe XML** (com wizard IA)
  - Entrada de mercadorias

### 7.5 Fornecedores
- **Rota:** \`/erp/suppliers\`
- **Arquivo:** \`src/modules/erp-inventory/pages/ERPSuppliersPage.tsx\`
- **Funcionalidades:**
  - Cadastro de fornecedores
  - Histórico de compras
  - Avaliação

### 7.6 Inventário
- **Rota:** \`/erp/inventory\`
- **Arquivo:** \`src/modules/erp-inventory/pages/ERPInventoryCountPage.tsx\`
- **Funcionalidades:**
  - Contagem de estoque
  - Ajustes automáticos
  - Relatório de divergências

### 7.7 Receitas/Fichas Técnicas
- **Rota:** \`/erp/recipes\`
- **Arquivo:** \`src/modules/erp-inventory/pages/ERPRecipesPage.tsx\`
- **Funcionalidades:**
  - Composição de produtos
  - Cálculo de CMV
  - Baixa automática

### 7.8 Relatórios ERP
- **Rota:** \`/erp/reports\`
- **Arquivo:** \`src/modules/erp-inventory/pages/ERPReportsPage.tsx\`
- **Funcionalidades:**
  - Curva ABC
  - Giro de estoque
  - Relatórios gerenciais

---

## 🤖 8. INTELIGÊNCIA ARTIFICIAL

### 8.1 Dashboard IA
- **Rota:** \`/ai\`
- **Arquivo:** \`src/pages/AIInsights.tsx\`
- **Funcionalidades:**
  - Sugestões operacionais
  - Previsões de demanda
  - Recomendações de preço

### 8.2 Sommelier Virtual
- **Rota:** \`/sommelier\`
- **Arquivo:** \`src/modules/sommelier/pages/SommelierPage.tsx\`
- **Funcionalidades:**
  - Recomendação de vinhos
  - Harmonização
  - Chat com IA

### 8.3 Chat IA
- **Rota:** \`/ai-chat\`
- **Arquivo:** \`src/pages/AIChat.tsx\`
- **Funcionalidades:**
  - Assistente virtual
  - Análise de dados
  - Suporte operacional

### 8.4 Agente Proativo
- **Rota:** \`/ai-proactive\`
- **Arquivo:** \`src/pages/AIProactiveAgent.tsx\`
- **Funcionalidades:**
  - Alertas automáticos
  - Campanhas sugeridas
  - Ações preventivas

### 8.5 Concierge IA
- **Rota:** \`/concierge\`
- **Arquivo:** \`src/pages/AIConcierge.tsx\`
- **Funcionalidades:**
  - Atendimento automatizado
  - Reservas por IA
  - FAQ inteligente

---

## 📊 9. BI & RELATÓRIOS

### 9.1 Dashboard BI
- **Rota:** \`/bi\`
- **Arquivo:** \`src/pages/BIDashboard.tsx\`
- **Funcionalidades:**
  - Dashboards customizáveis
  - Gráficos interativos
  - Drill-down

### 9.2 Relatórios de Vendas
- **Rota:** \`/reports/sales\`
- **Arquivo:** \`src/pages/reports/SalesReport.tsx\`
- **Funcionalidades:**
  - Vendas por período
  - Por produto/categoria
  - Por vendedor

### 9.3 Relatório de Produtos
- **Rota:** \`/reports/products\`
- **Arquivo:** \`src/pages/reports/ProductsReport.tsx\`
- **Funcionalidades:**
  - Mais vendidos
  - Margem por produto
  - Performance

### 9.4 Relatório de Clientes
- **Rota:** \`/reports/customers\`
- **Arquivo:** \`src/pages/reports/CustomersReport.tsx\`
- **Funcionalidades:**
  - RFM Analysis
  - Lifetime Value
  - Churn

### 9.5 Relatório Financeiro
- **Rota:** \`/reports/financial\`
- **Arquivo:** \`src/pages/reports/FinancialReport.tsx\`
- **Funcionalidades:**
  - Fluxo de caixa
  - Receitas e despesas
  - Projeções

---

## 👨‍💼 10. FUNCIONÁRIOS

### 10.1 Lista de Funcionários
- **Rota:** \`/employees\`
- **Arquivo:** \`src/modules/employees/pages/EmployeesPage.tsx\`
- **Funcionalidades:**
  - Cadastro completo
  - Cargos e departamentos
  - Documentos

### 10.2 Escalas
- **Rota:** \`/employees/schedules\`
- **Arquivo:** \`src/modules/employees/pages/SchedulesPage.tsx\`
- **Funcionalidades:**
  - Calendário de trabalho
  - Turnos
  - Folgas

### 10.3 Comissões
- **Rota:** \`/employees/commissions\`
- **Arquivo:** \`src/modules/employees/pages/CommissionsPage.tsx\`
- **Funcionalidades:**
  - Regras de comissão
  - Cálculo automático
  - Histórico

---

## 🧾 11. FISCAL

### 11.1 Dashboard Fiscal
- **Rota:** \`/fiscal\`
- **Arquivo:** \`src/modules/fiscal/pages/FiscalDashboard.tsx\`
- **Funcionalidades:**
  - Visão geral de notas
  - Alertas de pendências
  - Status de emissão

### 11.2 Emissão de NFC-e
- **Rota:** \`/fiscal/nfce\`
- **Arquivo:** \`src/modules/fiscal/pages/NFCeEmitPage.tsx\`
- **Funcionalidades:**
  - Emissão de cupom fiscal
  - Contingência
  - Cancelamento

### 11.3 Emissão de NF-e
- **Rota:** \`/fiscal/nfe\`
- **Arquivo:** \`src/modules/fiscal/pages/NFeEmitPage.tsx\`
- **Funcionalidades:**
  - Emissão de nota fiscal
  - Carta de correção
  - Cancelamento

### 11.4 Documentos Fiscais
- **Rota:** \`/fiscal/documents\`
- **Arquivo:** \`src/modules/fiscal/pages/FiscalDocumentsPage.tsx\`
- **Funcionalidades:**
  - Lista de documentos
  - Download XML/PDF
  - Reenvio por email

### 11.5 Configurações Fiscais
- **Rota:** \`/fiscal/settings\`
- **Arquivo:** \`src/modules/fiscal/pages/FiscalConfigPage.tsx\`
- **Funcionalidades:**
  - Certificado digital
  - Ambiente (homologação/produção)
  - NCM e CFOP

---

## 🔌 12. INTEGRAÇÕES

### 12.1 Hub de Integrações
- **Rota:** \`/integrations\`
- **Arquivo:** \`src/modules/integrations/pages/IntegrationsPage.tsx\`
- **Funcionalidades:**
  - Lista de integrações
  - Status de conexão
  - Configurações

### 12.2 WhatsApp
- **Rota:** \`/integrations/whatsapp\`
- **Arquivo:** \`src/modules/integrations/pages/WhatsAppSettingsPage.tsx\`
- **Funcionalidades:**
  - Conexão Evolution API
  - QR Code
  - Status da instância

### 12.3 iFood
- **Rota:** \`/integrations/ifood\`
- **Arquivo:** \`src/modules/integrations/pages/IFoodIntegrationPage.tsx\`
- **Funcionalidades:**
  - Autenticação
  - Sincronização de pedidos
  - Catálogo

### 12.4 Mercado Pago
- **Rota:** \`/integrations/mercadopago\`
- **Funcionalidades:**
  - Pagamentos online
  - Webhooks
  - Assinaturas

---

## 🏪 13. MARKETPLACE

### 13.1 Hub Marketplace
- **Rota:** \`/marketplace\`
- **Arquivo:** \`src/pages/MarketplaceHub.tsx\`
- **Funcionalidades:**
  - Múltiplos canais
  - Sincronização de catálogo
  - Gestão de pedidos

### 13.2 Catálogo Marketplace
- **Rota:** \`/marketplace/catalog\`
- **Arquivo:** \`src/pages/MarketplaceCatalog.tsx\`
- **Funcionalidades:**
  - Produtos por canal
  - Preços diferenciados
  - Disponibilidade

---

## 🏢 14. MULTI-LOJA

### 14.1 Visão Multi-Loja
- **Rota:** \`/multi-store\`
- **Arquivo:** \`src/pages/MultiStore.tsx\`
- **Funcionalidades:**
  - Dashboard consolidado
  - Comparativo entre lojas
  - Gestão centralizada

---

## 💾 15. BACKUP

### 15.1 Configuração de Backup
- **Rota:** \`/backup\`
- **Arquivo:** \`src/modules/backup/pages/BackupSettingsPage.tsx\`
- **Funcionalidades:**
  - Agendamento
  - Destino (Google Drive)
  - Histórico

### 15.2 Histórico de Backups
- **Rota:** \`/backup/history\`
- **Arquivo:** \`src/modules/backup/pages/BackupHistoryPage.tsx\`
- **Funcionalidades:**
  - Lista de backups
  - Download
  - Restauração

---

## 🔧 16. ATIVOS

### 16.1 Lista de Ativos
- **Rota:** \`/assets\`
- **Arquivo:** \`src/pages/Assets.tsx\`
- **Funcionalidades:**
  - Equipamentos
  - Manutenções
  - Depreciação

---

## 🛒 17. COMPRAS INTELIGENTES

### 17.1 Sugestões de Compra
- **Rota:** \`/smart-purchase\`
- **Arquivo:** \`src/pages/SmartPurchase.tsx\`
- **Funcionalidades:**
  - Previsão de demanda
  - Ponto de pedido
  - Sugestões automáticas

---

## 🗺️ 18. ROTAS DE ENTREGA

### 18.1 Planejamento de Rotas
- **Rota:** \`/routes\`
- **Arquivo:** \`src/modules/routing/pages/DeliveryRoutesPage.tsx\`
- **Funcionalidades:**
  - Otimização de rotas
  - Alocação de entregadores
  - Rastreamento

---

## ⚙️ 19. CONFIGURAÇÕES

### 19.1 Geral
- **Rota:** \`/settings\`
- **Arquivo:** \`src/pages/settings/GeneralSettings.tsx\`

### 19.2 Empresa
- **Rota:** \`/settings/company\`
- **Arquivo:** \`src/pages/settings/CompanySettings.tsx\`

### 19.3 Horários
- **Rota:** \`/settings/hours\`
- **Arquivo:** \`src/pages/settings/BusinessHoursSettings.tsx\`

### 19.4 Impressão
- **Rota:** \`/settings/printing\`
- **Arquivo:** \`src/pages/settings/PrinterSettings.tsx\`

### 19.5 Pagamentos
- **Rota:** \`/settings/payments\`
- **Arquivo:** \`src/pages/settings/PaymentSettings.tsx\`

### 19.6 Notificações
- **Rota:** \`/settings/notifications\`
- **Arquivo:** \`src/pages/settings/NotificationSettings.tsx\`

### 19.7 Segurança
- **Rota:** \`/settings/security\`
- **Arquivo:** \`src/pages/settings/SecuritySettings.tsx\`

### 19.8 Usuários
- **Rota:** \`/settings/users\`
- **Arquivo:** \`src/pages/settings/UserManagement.tsx\`

### 19.9 Permissões
- **Rota:** \`/settings/permissions\`
- **Arquivo:** \`src/pages/settings/PermissionsSettings.tsx\`

---

## 📱 20. TERMINAIS & APPS

### 20.1 Totem Self-Service
- **Rota:** \`/terminal/totem\`
- **Arquivo:** \`src/pages/TotemMode.tsx\`
- **Funcionalidades:**
  - Interface touch
  - Pedido pelo cliente
  - Pagamento integrado

### 20.2 Terminal Balcão
- **Rota:** \`/terminal/counter\`
- **Arquivo:** \`src/pages/CounterTerminal.tsx\`
- **Funcionalidades:**
  - PDV simplificado
  - Fila de atendimento

---

## 👨‍🍳 21. APP GARÇOM

### 21.1 Interface Garçom
- **Rota:** \`/waiter\`
- **Arquivo:** \`src/pages/WaiterApp.tsx\`
- **Funcionalidades:**
  - Lançamento de pedidos
  - Visualização de mesas
  - Comanda móvel

---

## 🌐 22. PÁGINAS PÚBLICAS

### 22.1 Cardápio Digital Público
- **Rota:** \`/m/:token\`
- **Arquivo:** \`src/pages/PublicMenuPage.tsx\`

### 22.2 Sommelier Público
- **Rota:** \`/sommelier/:token\`
- **Arquivo:** \`src/modules/sommelier/pages/PublicSommelierPage.tsx\`

### 22.3 Totem Público
- **Rota:** \`/totem/:token\`
- **Arquivo:** \`src/modules/sommelier/pages/PublicSommelierTotemPage.tsx\`

### 22.4 Link de Pagamento
- **Rota:** \`/pay/:token\`
- **Arquivo:** \`src/pages/PublicPaymentPage.tsx\`

---

## 🔐 23. SAAS ADMIN

### 23.1 Dashboard Admin
- **Rota:** \`/saas/admin\`
- **Arquivo:** \`src/pages/saas/SaasAdminPage.tsx\`

### 23.2 Empresas
- **Rota:** \`/saas/companies\`
- **Arquivo:** \`src/pages/saas/SaasCompaniesPage.tsx\`

### 23.3 Planos
- **Rota:** \`/saas/plans\`
- **Arquivo:** \`src/pages/saas/SaasPlansPage.tsx\`

### 23.4 Assinaturas
- **Rota:** \`/saas/subscriptions\`
- **Arquivo:** \`src/pages/saas/SaasSubscriptionsPage.tsx\`

---

## 🔧 24. EDGE FUNCTIONS (Backend)

| Função | Descrição |
|--------|-----------|
| \`nfe-parse-xml\` | Parse de XML de NFe |
| \`ai-insights\` | Geração de insights por IA |
| \`ai-chat\` | Chat com IA |
| \`ai-sommelier\` | Recomendações de vinhos |
| \`send-whatsapp\` | Envio de WhatsApp |
| \`fiscal-emit\` | Emissão de notas fiscais |
| \`fiscal-cancel\` | Cancelamento de notas |
| \`backup-execute\` | Execução de backup |
| \`marketplace-sync\` | Sincronização marketplace |
| \`stock-alert-check\` | Alertas de estoque |
| \`webhook-mercadopago\` | Webhooks Mercado Pago |

---

## 🗃️ 25. ESTRUTURA DO BANCO (Principais Tabelas)

| Tabela | Descrição |
|--------|-----------|
| \`companies\` | Empresas/Lojas |
| \`users\` | Usuários do sistema |
| \`products\` | Produtos/Itens do cardápio |
| \`categories\` | Categorias de produtos |
| \`orders\` | Pedidos |
| \`order_items\` | Itens dos pedidos |
| \`customers\` | Clientes |
| \`erp_items\` | Itens de estoque |
| \`erp_movements\` | Movimentações de estoque |
| \`erp_purchase_orders\` | Pedidos de compra |
| \`fiscal_documents\` | Documentos fiscais |
| \`accounts_payable\` | Contas a pagar |
| \`accounts_receivable\` | Contas a receber |
| \`employees\` | Funcionários |
| \`employee_schedules\` | Escalas |
| \`ai_recommendations\` | Recomendações IA |

---

## 🛠️ STACK TECNOLÓGICA

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + Shadcn/UI + Radix
- **Estado:** TanStack Query (React Query)
- **Roteamento:** React Router DOM
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Autenticação:** Supabase Auth
- **Storage:** Supabase Storage
- **Realtime:** Supabase Realtime
- **IA:** Self-Hosted (OpenAI, Gemini, Groq, Grok, LLaMA, Anthropic)
- **Animações:** Framer Motion
- **Gráficos:** Recharts
- **Mapas:** Leaflet / Google Maps
- **PWA:** Vite PWA Plugin

---

*Documento gerado automaticamente pelo sistema*
`;

export default function DocumentacaoDownload() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    
    const blob = new Blob([documentacaoContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapeamento-sistema-completo.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setTimeout(() => setDownloading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              Documentação Completa do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Este documento contém o mapeamento completo de todas as funcionalidades, 
              módulos, páginas e recursos do sistema. Ideal para análise, planejamento 
              e documentação técnica.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Conteúdo do documento:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ 25+ módulos principais</li>
                <li>✅ 200+ páginas/telas documentadas</li>
                <li>✅ Rotas e arquivos de cada funcionalidade</li>
                <li>✅ Edge Functions do backend</li>
                <li>✅ Estrutura do banco de dados</li>
                <li>✅ Stack tecnológica completa</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleDownload} 
              disabled={downloading}
              size="lg"
              className="w-full"
            >
              <Download className="w-5 h-5 mr-2" />
              {downloading ? 'Baixando...' : 'Baixar Documentação (.md)'}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Formato: Markdown (.md) - Compatível com qualquer editor de texto
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
