# 📋 MAPEAMENTO COMPLETO DO SISTEMA
## Tenant Base Forge - Documentação Técnica

**Data de Geração:** Janeiro 2026  
**Versão:** 1.0  
**Total de Telas:** ~200 páginas

---

# 🏠 MÓDULOS PRINCIPAIS

## 1. PEDIDOS & OPERAÇÕES

| Página | Rota | Função |
|--------|------|--------|
| Orders | `/orders` | Gestão de pedidos (criar, editar, status) |
| KDS | `/kds` | Kitchen Display System - Tela da cozinha |
| PhoneOrder | `/phone-order` | Pedidos por telefone |
| Tables | `/tables` | Gestão de mesas |
| TablesRegister | `/tables/register` | Registro em mesas |
| Comandas | `/comandas` | Gestão de comandas |
| ComandaDetail | `/comandas/:id` | Detalhe de comanda |
| Reservations | `/reservations` | Sistema de reservas |
| ServiceCallsMonitor | `/service-calls` | Monitor de chamados de garçom |
| PrintStation | `/print-station` | Estação de impressão |
| TimerDashboard | `/timer-dashboard` | Dashboard de tempos/SLA |

---

## 2. CARDÁPIO & PRODUTOS

| Página | Rota | Função |
|--------|------|--------|
| Products | `/products` | Cadastro de produtos |
| Categories | `/categories` | Categorias |
| Subcategories | `/subcategories` | Subcategorias |
| Flavors | `/flavors` | Sabores (pizza) |
| FlavorHighlightGroups | `/flavor-highlights` | Grupos de destaque de sabores |
| OptionalGroups | `/optional-groups` | Grupos de opcionais/adicionais |
| AdvancedMenu | `/advanced-menu` | Cardápio avançado (alérgenos, harmonização) |
| TimeHighlights | `/time-highlights` | Destaques por horário |
| Banners | `/banners` | Banners do cardápio |

---

## 3. DELIVERY

| Página | Rota | Função |
|--------|------|--------|
| DeliveryMenu | `/delivery-menu` | Cardápio delivery |
| Deliverers | `/deliverers` | Cadastro de entregadores |
| DelivererTracking | `/deliverer-tracking` | Rastreamento de entregas |
| DelivererSettlement | `/deliverer-settlement` | Acerto com entregadores |
| DelivererRankings | `/deliverer-rankings` | Ranking de entregadores |
| DelivererBadge | `/deliverer-badge` | Badges/conquistas entregadores |
| DeliveryExpedition | `/delivery-expedition` | Expedição de entregas |
| DelivererApp | `/deliverer-app` | App do entregador |

---

## 4. CLIENTES & CRM

### Páginas Principais

| Página | Rota | Função |
|--------|------|--------|
| Customers | `/customers` | Cadastro de clientes |
| CustomerCredits | `/customer-credits` | Créditos/Fiado de clientes |
| Loyalty | `/loyalty` | Programa de fidelidade |
| ReferralProgram | `/referral` | Programa de indicação |
| Gamification | `/gamification` | Gamificação (pontos, badges) |
| Reviews | `/reviews` | Avaliações de clientes |
| ChurnPrediction | `/churn-prediction` | Predição de churn (IA) |

### Módulo CRM

| Página | Rota | Função |
|--------|------|--------|
| CRMDashboard | `/crm` | Dashboard CRM |
| CRMLeads | `/crm/leads` | Gestão de leads |
| CRMCustomers | `/crm/customers` | Clientes CRM |
| CRMActivities | `/crm/activities` | Atividades/tarefas |
| CRMAutomations | `/crm/automations` | Automações CRM |
| CRMPipeline | `/crm/pipeline` | Pipeline de vendas |

---

## 5. MARKETING

### Páginas Principais

| Página | Rota | Função |
|--------|------|--------|
| Marketing | `/marketing` | Marketing geral |
| Campaigns | `/campaigns` | Campanhas |
| Coupons | `/coupons` | Cupons de desconto |
| AIMarketingPosts | `/ai-marketing-posts` | Posts gerados por IA |
| Repurchase | `/repurchase` | Recompra/remarketing |

### Módulo Marketing Hub

| Página | Rota | Função |
|--------|------|--------|
| MarketingDashboard | `/marketing-hub` | Dashboard marketing |
| MarketingCampaigns | `/marketing-hub/campaigns` | Campanhas avançadas |
| MarketingAutomations | `/marketing-hub/automations` | Automações de marketing |

---

## 6. FINANCEIRO

### Páginas Principais

| Página | Rota | Função |
|--------|------|--------|
| FinanceDashboard | `/finance` | Dashboard financeiro |
| CashRegister | `/cash-register` | Caixa (abertura/fechamento) |
| CashHistory | `/cash-history` | Histórico de caixa |
| AccountsPayable | `/accounts-payable` | Contas a pagar |
| ChartOfAccounts | `/chart-of-accounts` | Plano de contas |
| BankAccounts | `/bank-accounts` | Contas bancárias |
| BankReconciliation | `/bank-reconciliation` | Conciliação bancária |
| PaymentMethods | `/payment-methods` | Formas de pagamento |

### Módulo ERP Financeiro

| Página | Rota | Função |
|--------|------|--------|
| ERPDashboard | `/erp` | Dashboard ERP financeiro |
| ERPSalesReport | `/erp/sales` | Relatório de vendas |
| ERPTopProducts | `/erp/top-products` | Produtos mais vendidos |
| ERPDiscounts | `/erp/discounts` | Análise de descontos |
| ERPDeliveryFees | `/erp/delivery-fees` | Taxas de entrega |
| ERPReceivables | `/erp/receivables` | Contas a receber |
| ERPPayables | `/erp/payables` | Contas a pagar ERP |
| ERPCostCenters | `/erp/cost-centers` | Centros de custo |
| ERPProductCosts | `/erp/product-costs` | Custos de produtos |
| ERPDRE | `/erp/dre` | DRE (Demonstrativo de Resultado) |
| ERPDREAdvanced | `/erp/dre-advanced` | DRE avançado |
| ERPCMV | `/erp/cmv` | CMV (Custo de Mercadoria Vendida) |
| ERPCashFlow | `/erp/cash-flow` | Fluxo de caixa |
| ERPExecutive | `/erp/executive` | Painel executivo |
| ERPBudgets | `/erp/budgets` | Orçamentos |
| ERPAlerts | `/erp/alerts` | Alertas financeiros |

---

## 7. ERP ESTOQUE

| Página | Rota | Função |
|--------|------|--------|
| ERPStockDashboard | `/erp-stock` | Dashboard de estoque |
| ERPItems | `/erp-stock/items` | Cadastro de insumos/itens |
| ERPSuppliers | `/erp-stock/suppliers` | Fornecedores |
| ERPPurchases | `/erp-stock/purchases` | Compras/Entradas + **NF-e Wizard com IA** |
| ERPRecipes | `/erp-stock/recipes` | Fichas técnicas |
| ERPStock | `/erp-stock/stock` | Posição de estoque |
| ERPMovements | `/erp-stock/movements` | Movimentações de estoque |
| ERPInventoryCount | `/erp-stock/inventory-count` | Inventário/Contagem |
| ERPCMVAnalysis | `/erp-stock/cmv-analysis` | Análise de CMV |
| ERPPricing | `/erp-stock/pricing` | Precificação |
| ERPProfit | `/erp-stock/profit` | Análise de lucro |

### Funcionalidades do NF-e Wizard

- **Step 1 - Manifestação:** Ciência, Confirmação, Desconhecimento, Não Realizada
- **Step 2 - Itens:** 
  - Vinculação automática por histórico
  - Sugestão por IA
  - Alertas de margem (cores: azul/verde/amarelo/vermelho)
  - EAN, código interno, fator de conversão
  - Categoria/subcategoria
  - CFOP de entrada
- **Step 3 - Financeiro:**
  - Plano de contas
  - Centro de custo
  - Condições de pagamento (parcelas)
  - Geração automática de conta a pagar
- **Step 4 - Conclusão:**
  - Movimentação de estoque
  - Atualização de custo médio
  - Atualização de fichas técnicas

---

## 8. INTELIGÊNCIA ARTIFICIAL

| Página | Rota | Função |
|--------|------|--------|
| AIRecommendations | `/ai-recommendations` | Recomendações IA |
| AISuggestions | `/ai-suggestions` | Sugestões operacionais |
| AIOperational | `/ai-operational` | IA operacional |
| AIMenuCreative | `/ai-menu-creative` | Criação de cardápio IA |
| AITVScheduler | `/ai-tv-scheduler` | Agendador de TV IA |
| AIMarketingPosts | `/ai-marketing-posts` | Posts de marketing IA |
| VoiceAISettings | `/voice-ai` | Configurações de voz IA |
| AIConciergeSettings | `/ai-concierge` | Concierge IA |
| PredictiveUpsellingSettings | `/predictive-upselling` | Upselling preditivo |
| SmartKDSSettings | `/smart-kds` | KDS inteligente |
| ChatbotSettings | `/chatbot-settings` | Configurações chatbot |
| DemandForecast | `/demand-forecast` | Previsão de demanda |
| DynamicPricing | `/dynamic-pricing` | Precificação dinâmica |

---

## 9. BI & RELATÓRIOS

| Página | Rota | Função |
|--------|------|--------|
| BusinessIntelligence | `/bi` | BI básico |
| BIAdvanced | `/bi-advanced` | BI avançado |
| Reports | `/reports` | Central de relatórios |
| DelayReports | `/reports/delays` | Relatório de atrasos |
| FiadoReports | `/reports/fiado` | Relatório de fiado |
| SalesByPeriodReport | `/reports/sales-by-period` | Vendas por período |
| PerformancePanel | `/performance` | Painel de performance |
| OperationsPerformance | `/operations-performance` | Performance operacional |
| StaffPerformance | `/staff-performance` | Performance de equipe |

---

## 10. FUNCIONÁRIOS

| Página | Rota | Função |
|--------|------|--------|
| Employees | `/employees` | Cadastro de funcionários |
| EmployeeSchedules | `/employees/schedules` | Escalas de trabalho |
| EmployeeCommissions | `/employees/commissions` | Comissões |

---

## 11. FISCAL

| Página | Rota | Função |
|--------|------|--------|
| FiscalDocuments | `/fiscal` | Documentos fiscais (NF-e, NFC-e) |
| FiscalSettings | `/fiscal/settings` | Configurações fiscais |

---

## 12. INTEGRAÇÕES

| Página | Rota | Função |
|--------|------|--------|
| IntegrationsDashboard | `/integrations` | Dashboard integrações |
| WhatsAppCenter | `/integrations/whatsapp` | Central WhatsApp |
| PaymentCenter | `/integrations/payments` | Central de pagamentos |
| WhatsApp | `/whatsapp` | Configuração WhatsApp |
| ChatMonitor | `/chat-monitor` | Monitor de conversas |

---

## 13. MARKETPLACE

| Página | Rota | Função |
|--------|------|--------|
| MarketplaceIntegrations | `/marketplace` | Integrações iFood, Rappi, Uber Eats |
| MarketplaceOrders | `/marketplace/orders` | Pedidos de marketplace |

---

## 14. MULTI-LOJA

| Página | Rota | Função |
|--------|------|--------|
| MultiStore | `/multi-store` | Gestão multi-loja/franquias |

---

## 15. BACKUP

| Página | Rota | Função |
|--------|------|--------|
| BackupSettings | `/backup` | Configurações de backup |
| GoogleDriveCallback | `/backup/google-callback` | Callback Google Drive |

---

## 16. ATIVOS/EQUIPAMENTOS

| Página | Rota | Função |
|--------|------|--------|
| Assets | `/assets` | Cadastro de ativos/equipamentos |
| AssetMaintenance | `/assets/maintenance` | Manutenções programadas |

---

## 17. COMPRAS INTELIGENTES

| Página | Rota | Função |
|--------|------|--------|
| PurchaseSuggestions | `/smart-purchasing` | Sugestões de compra por IA |
| SupplierQuotes | `/smart-purchasing/quotes` | Cotações de fornecedores |

---

## 18. ROTAS DE ENTREGA

| Página | Rota | Função |
|--------|------|--------|
| DeliveryRoutes | `/delivery-routes` | Roteirização inteligente de entregas |

---

# ⚙️ CONFIGURAÇÕES

| Página | Rota | Função |
|--------|------|--------|
| SettingsBranding | `/settings/branding` | Marca/identidade visual |
| SettingsIntegrations | `/settings/integrations` | Integrações |
| SettingsAI | `/settings/ai` | Configurações de IA |
| SettingsLayout | `/settings/layout` | Layout geral |
| SettingsPrinting | `/settings/printing` | Impressão |
| SettingsOnlineMenu | `/settings/online-menu` | Cardápio online |
| SettingsOnlineStore | `/settings/online-store` | Loja online |
| SettingsDelivery | `/settings/delivery` | Delivery |
| DeliverySimulator | `/settings/delivery-simulator` | Simulador de delivery |
| SettingsKDS | `/settings/kds` | KDS |
| SettingsTimers | `/settings/timers` | Temporizadores/SLA |
| SettingsWheel | `/settings/wheel` | Roleta de prêmios |
| SettingsPanic | `/settings/panic` | Botão de pânico |
| SettingsCustomers | `/settings/customers` | Clientes |
| SettingsCash | `/settings/cash` | Caixa |
| SettingsOrders | `/settings/orders` | Pedidos |
| SettingsSounds | `/settings/sounds` | Sons/notificações |
| SettingsTable | `/settings/table` | Mesa/salão |
| SettingsTables | `/settings/tables` | Mesas (mapa) |
| SettingsScale | `/settings/scale` | Balança |
| SettingsDelivererTracking | `/settings/deliverer-tracking` | Rastreamento entregador |
| SettingsSmartPOS | `/settings/smart-pos` | SmartPOS |
| SettingsPizza | `/settings/pizza` | Pizza |
| SettingsReservations | `/settings/reservations` | Reservas |
| SettingsTabletAutoatendimento | `/settings/tablet-autoatendimento` | Tablet autoatendimento |
| SettingsTVDisplay | `/settings/tv-display` | TV Display |
| SettingsKiosk | `/settings/kiosk` | Kiosk/Totem |
| SettingsOperatorPermissions | `/settings/operator-permissions` | Permissões operador |
| SettingsProactiveAgent | `/settings/proactive-agent` | Agente proativo IA |
| SettingsTEF | `/settings/tef` | TEF (transferência eletrônica) |
| SettingsSommelier | `/settings/sommelier` | Sommelier IA |

---

# 🖥️ TERMINAIS & APPS

| Página | Rota | Função |
|--------|------|--------|
| OperatorTerminal | `/operator-terminal` | Terminal de operador |
| PDVLoja | `/pdv-loja` | PDV Loja física |
| SelfCheckout | `/self-checkout` | Self-checkout |
| SelfService | `/self-service` | Autoatendimento |
| TabletAutoatendimento | `/tablet-autoatendimento` | Tablet autoatendimento |
| TabletKiosk | `/tablet-kiosk` | Kiosk/Totem |
| ScaleTerminal | `/scale-terminal` | Terminal de balança |
| SmartPOSSimulator | `/smart-pos-simulator` | Simulador SmartPOS |

---

# 📱 APP GARÇOM

| Página | Rota | Função |
|--------|------|--------|
| WaiterHome | `/waiter` | Home do garçom |
| WaiterTablesMap | `/waiter/tables` | Mapa de mesas |
| WaiterComandasMap | `/waiter/comandas` | Mapa de comandas |
| WaiterTableDetail | `/waiter/table/:id` | Detalhe mesa |
| WaiterComandaDetail | `/waiter/comanda/:id` | Detalhe comanda |

---

# 🌐 PÁGINAS PÚBLICAS

| Página | Rota | Função |
|--------|------|--------|
| PublicMenuByToken | `/menu/:token` | Cardápio por token |
| PublicMenuBySlug | `/m/:slug` | Cardápio por slug |
| PublicTVByToken | `/tv/:token` | TV Display |
| PublicRoletaByToken | `/roleta/:token` | Roleta de prêmios |
| PublicKDSByToken | `/kds-public/:token` | KDS público |
| PublicCallPanel | `/call-panel/:token` | Painel de chamada |
| PublicSelfServiceByToken | `/self/:token` | Autoatendimento |
| PublicQRMesa | `/qr/mesa/:tableId` | QR Code mesa |
| PublicQRComanda | `/qr/comanda/:comandaId` | QR Code comanda |
| PublicReservationBySlug | `/reservas/:slug` | Reservas por slug |
| PublicReservationPortal | `/reservation-portal/:token` | Portal reservas |
| PublicOptOut | `/optout/:token` | Opt-out marketing |
| PublicReviewByToken | `/review/:token` | Avaliação |
| KioskPublic | `/kiosk/:token` | Kiosk público |
| PublicSommelier | `/sommelier/:token` | Sommelier público |
| PublicSommelierTotem | `/sommelier-totem/:token` | Totem sommelier |
| TVMenuPublic | `/tv-menu/:token` | Menu TV |

---

# 👑 SAAS ADMIN

| Página | Rota | Função |
|--------|------|--------|
| SaasDashboard | `/saas` | Dashboard SaaS |
| SaasCompanies | `/saas/companies` | Empresas/clientes |
| SaasCompanyDetails | `/saas/companies/:id` | Detalhes empresa |
| SaasPlans | `/saas/plans` | Planos |
| SaasSubscriptions | `/saas/subscriptions` | Assinaturas |
| SaasTemplates | `/saas/templates` | Templates |
| SaasAudit | `/saas/audit` | Auditoria |
| SaasUsers | `/saas/users` | Usuários SaaS |
| SaasLicenses | `/saas/licenses` | Licenças |
| SaasBackup | `/saas/backup` | Backup central |

---

# 🔧 OUTROS

| Página | Rota | Função |
|--------|------|--------|
| Company | `/company` | Dados da empresa |
| Users | `/users` | Usuários do sistema |
| Profiles | `/profiles` | Perfis |
| MyLinks | `/my-links` | Meus links (QR Codes) |
| TVScreens | `/tv-screens` | Telas de TV |
| Inventory | `/inventory` | Inventário (legado) |
| ImportExport | `/import-export` | Importação/Exportação |
| BatchActions | `/batch-actions` | Ações em lote |
| InternalMessages | `/internal-messages` | Mensagens internas |
| AuditLogs | `/audit-logs` | Logs de auditoria |
| SystemManual | `/manual` | Manual do sistema |
| Onboarding | `/onboarding` | Onboarding inicial |
| Demo | `/demo` | Demonstração |
| ROICalculator | `/roi-calculator` | Calculadora ROI |
| SmartWaitlist | `/smart-waitlist` | Lista de espera inteligente |
| Prizes | `/prizes` | Prêmios |
| PrizeWheel | `/prize-wheel` | Roleta de prêmios |
| QA | `/qa` | Controle de qualidade |

---

# 📊 RESUMO QUANTITATIVO

| Categoria | Quantidade |
|-----------|------------|
| Páginas principais | ~130 |
| Configurações | 31 |
| Módulos especializados | 17 |
| Páginas públicas | 17 |
| SaaS Admin | 10 |
| Terminais/Apps | 8 |
| **TOTAL** | **~200 telas** |

---

# 🗄️ ESTRUTURA DE BANCO DE DADOS

## Tabelas Principais

### Operacional
- `orders` - Pedidos
- `order_items` - Itens de pedido
- `products` - Produtos
- `categories` - Categorias
- `subcategories` - Subcategorias
- `tables` - Mesas
- `comandas` - Comandas
- `reservations` - Reservas

### Clientes
- `customers` - Clientes
- `customer_credits` - Créditos de clientes
- `customer_points` - Pontos de fidelidade
- `reviews` - Avaliações

### Financeiro
- `accounts_payable` - Contas a pagar
- `cash_registers` - Caixas
- `bank_accounts` - Contas bancárias
- `bank_transactions` - Transações bancárias
- `chart_of_accounts` - Plano de contas
- `cost_centers` - Centros de custo

### ERP Estoque
- `erp_items` - Insumos/itens
- `erp_suppliers` - Fornecedores
- `erp_purchase_entries` - Entradas de compra
- `erp_purchase_entry_items` - Itens de entrada
- `erp_stock_movements` - Movimentações de estoque
- `erp_recipes` - Fichas técnicas
- `erp_recipe_lines` - Linhas de receita
- `erp_nfe_imports` - Importações NF-e
- `erp_supplier_product_links` - Vínculos fornecedor-produto

### CRM
- `ai_leads` - Leads
- `ai_lead_events` - Eventos de lead
- `crm_pipeline_stages` - Estágios do pipeline
- `crm_activities` - Atividades
- `crm_automations` - Automações

### Marketing
- `campaigns` - Campanhas
- `coupons` - Cupons
- `ai_marketing_posts` - Posts de marketing IA
- `banners` - Banners

### IA
- `ai_recommendations` - Recomendações
- `ai_operational_suggestions` - Sugestões operacionais
- `ai_churn_predictions` - Predições de churn
- `ai_combo_suggestions` - Sugestões de combos
- `ai_customer_segments` - Segmentação de clientes

### Funcionários
- `employees` - Funcionários
- `employee_schedules` - Escalas
- `employee_commissions` - Comissões

### Ativos
- `assets` - Ativos/equipamentos
- `asset_maintenance` - Manutenções
- `asset_alerts` - Alertas

---

# 🔗 EDGE FUNCTIONS (Backend)

| Função | Descrição |
|--------|-----------|
| `nfe-parse-xml` | Parser de XML NF-e com IA |
| `ai-insights` | Geração de insights por IA |
| `ai-chat` | Chat com IA |
| `send-email` | Envio de emails |
| `whatsapp-webhook` | Webhook WhatsApp |
| `process-payment` | Processamento de pagamentos |

---

# 🎨 TECNOLOGIAS

| Categoria | Tecnologia |
|-----------|------------|
| Frontend | React 18 + TypeScript |
| Estilização | Tailwind CSS + shadcn/ui |
| Roteamento | React Router v6 |
| Estado | TanStack Query (React Query) |
| Backend | Supabase (Lovable Cloud) |
| Banco de Dados | PostgreSQL |
| Autenticação | Supabase Auth |
| IA | Self-Hosted AI Providers |
| Animações | Framer Motion |

---

*Documento gerado automaticamente pelo sistema.*
