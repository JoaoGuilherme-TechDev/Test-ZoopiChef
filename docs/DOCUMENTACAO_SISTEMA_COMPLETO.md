# Documentação Completa do Sistema Zoopi

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Mapa do Projeto](#mapa-do-projeto)
4. [Estrutura de Pastas](#estrutura-de-pastas)
5. [Banco de Dados](#banco-de-dados)
6. [CRUDs e Funcionalidades](#cruds-e-funcionalidades)
7. [Edge Functions](#edge-functions)
8. [Rotas da Aplicação](#rotas-da-aplicação)
9. [Hooks Personalizados](#hooks-personalizados)
10. [Componentes Principais](#componentes-principais)
11. [Fluxos de Negócio](#fluxos-de-negócio)
12. [Integrações](#integrações)
13. [Segurança](#segurança)

---

## 1. Visão Geral

O **Zoopi** é um sistema SaaS multi-tenant completo para gestão de estabelecimentos comerciais, focado em:
- Cardápio digital multi-canal (Delivery, QR Code, Totem, TV)
- Gestão de pedidos com Kanban
- Sistema de entregas
- IA para gestão e vendas
- Gamificação (Roleta de prêmios)
- Campanhas de marketing
- Sistema de fidelidade

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite |
| Estilização | Tailwind CSS, Shadcn/UI |
| Estado | TanStack Query, Context API |
| Roteamento | React Router DOM v6 |
| Backend | Lovable Cloud (Supabase) |
| Banco de Dados | PostgreSQL |
| Edge Functions | Deno |
| IA | Self-Hosted AI Providers (via UI) |

---

## 2. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  Pages (Rotas)  │  Components  │  Hooks  │  Contexts  │  Utils  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LOVABLE CLOUD (Supabase)                    │
├──────────────────┬──────────────────┬───────────────────────────┤
│   PostgreSQL     │  Edge Functions  │   Storage   │   Realtime  │
│   (Dados + RLS)  │  (Lógica Server) │  (Arquivos) │  (WebSocket)│
└──────────────────┴──────────────────┴───────────────────────────┘
```

### Modelo Multi-Tenant

- Isolamento por `company_id` em todas as tabelas
- Row Level Security (RLS) para proteção de dados
- Tokens públicos para acesso sem autenticação

---

## 3. Mapa do Projeto

```
ZOOPI SYSTEM MAP
================

┌──────────────────────────────────────────────────────────────────────────┐
│                              MÓDULOS PRINCIPAIS                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Dashboard  │  │   Pedidos   │  │   Cardápio  │  │   Clientes  │     │
│  │  /dashboard │  │   /orders   │  │  /products  │  │  /customers │     │
│  │             │  │   /tables   │  │ /categories │  │             │     │
│  │ - Métricas  │  │ - Kanban    │  │ /subcategor │  │ - Lista     │     │
│  │ - Gráficos  │  │ - KDS       │  │             │  │ - Endereços │     │
│  │ - Resumo    │  │ - Impressão │  │ - Produtos  │  │ - Histórico │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Entregadores│  │   Banners   │  │     TV      │  │     IA      │     │
│  │ /deliverers │  │  /banners   │  │ /tv-screens │  │ /ai-manager │     │
│  │             │  │             │  │             │  │ /ai-suggest │     │
│  │ - Lista     │  │ - Upload    │  │ - Config    │  │ /ai-creative│     │
│  │ - App       │  │ - Ordem     │  │ - Preview   │  │             │     │
│  │ - Acerto    │  │ - Ativo     │  │ - Tokens    │  │ - Análises  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Prêmios   │  │  Marketing  │  │  Fidelidade │  │ Relatórios  │     │
│  │   /prizes   │  │ /campaigns  │  │  /loyalty   │  │  /reports   │     │
│  │   /roleta   │  │  /whatsapp  │  │             │  │             │     │
│  │             │  │             │  │ - Config    │  │ - Vendas    │     │
│  │ - Cadastro  │  │ - Campanhas │  │ - Resgates  │  │ - Produtos  │     │
│  │ - Sorteios  │  │ - Templates │  │ - Ranking   │  │ - Horários  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                           PÁGINAS PÚBLICAS                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Delivery  │  │   QR Code   │  │    Totem    │  │     TV      │     │
│  │  /m/:token  │  │  /q/:token  │  │  /t/:token  │  │ /tv/:token  │     │
│  │             │  │             │  │             │  │             │     │
│  │ - Cardápio  │  │ - Cardápio  │  │ - Cardápio  │  │ - Banners   │     │
│  │ - Carrinho  │  │ - Mesa      │  │ - Autoatend │  │ - Produtos  │     │
│  │ - Checkout  │  │ - Carrinho  │  │ - Carrinho  │  │ - Rotação   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │   Roleta    │  │     KDS     │  │  Entregador │                      │
│  │  /r/:token  │  │ /kds/:token │  │/deliverer/: │                      │
│  │             │  │             │  │    token    │                      │
│  │ - Girar     │  │ - Pedidos   │  │ - Pedidos   │                      │
│  │ - Prêmios   │  │ - Status    │  │ - Rotas     │                      │
│  │ - Resgatar  │  │ - Tempo     │  │ - Mapa      │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                              ADMIN SAAS                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Dashboard │  │  Empresas   │  │   Planos    │  │  Assinat.   │     │
│  │/saas/dashbo │  │/saas/compan │  │ /saas/plans │  │/saas/subscr │     │
│  │             │  │             │  │             │  │             │     │
│  │ - Métricas  │  │ - Lista     │  │ - CRUD      │  │ - Lista     │     │
│  │ - Revenue   │  │ - Detalhes  │  │ - Features  │  │ - Status    │     │
│  │ - Growth    │  │ - Bloquear  │  │ - Preços    │  │ - Faturas   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Estrutura de Pastas

```
src/
├── components/
│   ├── ai-assistant/      # Chat IA interno
│   │   └── AIAssistantChat.tsx
│   ├── chat/              # Widget chat
│   │   └── AIChatWidget.tsx
│   ├── guards/            # Proteção de rotas
│   │   └── CompanyAccessGuard.tsx
│   ├── kds/               # Kitchen Display System
│   │   ├── KDSLayout.tsx
│   │   └── KDSOrderCard.tsx
│   ├── layout/            # Layout principal
│   │   ├── AppSidebar.tsx
│   │   └── DashboardLayout.tsx
│   ├── marketing/         # Scripts de tracking
│   │   ├── MarketingScripts.tsx
│   │   └── SocialLinks.tsx
│   ├── menu/              # Componentes do cardápio
│   │   ├── CartButton.tsx
│   │   ├── CartSheet.tsx
│   │   ├── ProductCard.tsx
│   │   └── SalesSuggestions.tsx
│   ├── orders/            # Gestão de pedidos
│   │   ├── CashClosingDialog.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── OrderCard.tsx
│   │   └── SectorPrintMenu.tsx
│   ├── prizes/            # Roleta de prêmios
│   │   └── PrizeWheel.tsx
│   ├── public/            # Componentes públicos
│   │   ├── PublicChatWidget.tsx
│   │   └── StoreUnavailable.tsx
│   ├── saas/              # Admin SaaS
│   │   └── SaasLayout.tsx
│   ├── subscription/      # Avisos de assinatura
│   │   └── SubscriptionWarningBanner.tsx
│   └── ui/                # Componentes Shadcn/UI
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ... (50+ componentes)
│
├── contexts/
│   ├── AuthContext.tsx    # Autenticação
│   └── CartContext.tsx    # Carrinho de compras
│
├── hooks/
│   ├── useOrders.ts       # CRUD pedidos
│   ├── useProducts.ts     # CRUD produtos
│   ├── useCategories.ts   # CRUD categorias
│   ├── useCustomers.ts    # CRUD clientes
│   ├── useDeliverers.ts   # CRUD entregadores
│   ├── useBanners.ts      # CRUD banners
│   ├── useTables.ts       # CRUD mesas
│   ├── usePrizes.ts       # CRUD prêmios
│   ├── useCampaigns.ts    # CRUD campanhas
│   ├── useCompany.ts      # Dados da empresa
│   ├── useProfile.ts      # Perfil do usuário
│   ├── useAIRecommendations.ts
│   ├── useAISuggestions.ts
│   └── ... (30+ hooks)
│
├── pages/
│   ├── Dashboard.tsx
│   ├── Orders.tsx
│   ├── Products.tsx
│   ├── Categories.tsx
│   ├── Subcategories.tsx
│   ├── Customers.tsx
│   ├── Deliverers.tsx
│   ├── DelivererApp.tsx      # App público entregador
│   ├── DelivererSettlement.tsx
│   ├── Banners.tsx
│   ├── TVScreens.tsx
│   ├── TVMenuPublic.tsx
│   ├── PublicTVByToken.tsx
│   ├── Tables.tsx
│   ├── Prizes.tsx
│   ├── PrizeWheel.tsx
│   ├── PublicRoletaByToken.tsx
│   ├── Campaigns.tsx
│   ├── WhatsApp.tsx
│   ├── Marketing.tsx
│   ├── Loyalty.tsx           # Sistema de fidelidade
│   ├── Reports.tsx           # Relatórios avançados
│   ├── AIRecommendations.tsx
│   ├── AISuggestions.tsx
│   ├── AIMenuCreative.tsx
│   ├── AITVScheduler.tsx
│   ├── Repurchase.tsx
│   ├── PublicMenuByToken.tsx
│   ├── DeliveryMenu.tsx
│   ├── PhoneOrder.tsx
│   ├── Tablet.tsx
│   ├── KDS.tsx
│   ├── PublicKDSByToken.tsx
│   ├── MyLinks.tsx
│   ├── Users.tsx
│   ├── Profiles.tsx
│   ├── Company.tsx
│   ├── Settings.tsx
│   ├── Onboarding.tsx
│   ├── Auth.tsx
│   ├── Blocked.tsx
│   ├── QA.tsx
│   ├── NotFound.tsx
│   ├── settings/             # Configurações
│   │   ├── SettingsLayout.tsx
│   │   ├── SettingsAI.tsx
│   │   ├── SettingsBranding.tsx
│   │   ├── SettingsDelivery.tsx
│   │   ├── SettingsIntegrations.tsx
│   │   ├── SettingsKDS.tsx
│   │   ├── SettingsOnlineMenu.tsx
│   │   ├── SettingsPrinting.tsx
│   │   └── DeliverySimulator.tsx
│   ├── saas/                 # Admin SaaS
│   │   ├── SaasDashboard.tsx
│   │   ├── SaasCompanies.tsx
│   │   ├── SaasCompanyDetails.tsx
│   │   ├── SaasPlans.tsx
│   │   ├── SaasSubscriptions.tsx
│   │   ├── SaasTemplates.tsx
│   │   └── SaasAudit.tsx
│   └── reports/
│       └── DelayReports.tsx
│
├── lib/
│   ├── utils.ts              # Utilitários gerais
│   ├── campaigns/
│   │   └── messageTemplates.ts
│   ├── delivery/
│   │   └── calculateDelivery.ts
│   ├── marketing/
│   │   └── trackingService.ts
│   └── print/
│       ├── PrintService.ts
│       ├── sectorPrint.ts
│       ├── types.ts
│       └── providers/
│
├── integrations/
│   └── supabase/
│       ├── client.ts         # Cliente Supabase
│       └── types.ts          # Tipos gerados
│
├── utils/
│   ├── printOrder.ts
│   └── tokenValidation.ts
│
├── App.tsx                   # Rotas principais
├── App.css
├── index.css                 # Design tokens
├── main.tsx
└── vite-env.d.ts

supabase/
├── config.toml               # Configuração
└── functions/
    ├── ai-assistant/         # Chat IA interno
    ├── ai-campaigns/         # Campanhas IA
    ├── ai-chat/              # Chat geral
    ├── ai-healthcheck/       # Verificação saúde IA
    ├── ai-manager/           # IA gestora
    ├── ai-menu-creative/     # Banners criativos
    ├── ai-menu-highlight/    # Destaques menu
    ├── ai-repurchase/        # Recompra
    ├── ai-tts/               # Text-to-speech
    ├── ai-tv-highlight/      # Destaques TV
    ├── ai-tv-scheduler/      # Agendamento TV
    ├── ai-whatsapp-suggest/  # Sugestões WhatsApp
    ├── analyze-business/     # Análise negócio
    ├── clone-company-menu/   # Clonar cardápio
    ├── process-status-notifications/ # Notificações
    ├── public-chat/          # Chat público
    ├── public-create-order/  # Criar pedido público
    ├── run-qa-tests/         # Testes QA
    ├── send-whatsapp/        # Enviar WhatsApp
    ├── send-whatsapp-direct/ # WhatsApp direto
    ├── test-token-stability/ # Teste tokens
    ├── test-tv/              # Teste TV
    ├── webhook-asaas/        # Webhook Asaas
    ├── webhook-mercadopago/  # Webhook MercadoPago
    └── webhook-whatsapp/     # Webhook WhatsApp
```

---

## 5. Banco de Dados

### Diagrama de Relacionamentos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CORE TABLES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │  companies   │◄────────│   profiles   │────────►│  user_roles  │    │
│  │              │         │              │         │              │    │
│  │ id           │         │ id           │         │ id           │    │
│  │ name         │         │ user_id      │         │ user_id      │    │
│  │ slug         │         │ company_id   │         │ company_id   │    │
│  │ is_active    │         │ full_name    │         │ role         │    │
│  │ is_blocked   │         │ avatar_url   │         │              │    │
│  │ menu_token   │         │              │         │              │    │
│  │ ...          │         │              │         │              │    │
│  └──────┬───────┘         └──────────────┘         └──────────────┘    │
│         │                                                               │
│         │ 1:N                                                           │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        MENU STRUCTURE                             │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │                                                                   │  │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │  │
│  │  │  categories  │───►│ subcategories│───►│   products   │        │  │
│  │  │              │    │              │    │              │        │  │
│  │  │ id           │    │ id           │    │ id           │        │  │
│  │  │ company_id   │    │ company_id   │    │ company_id   │        │  │
│  │  │ name         │    │ category_id  │    │ subcategory_id│       │  │
│  │  │ active       │    │ name         │    │ name         │        │  │
│  │  │              │    │ active       │    │ price        │        │  │
│  │  │              │    │              │    │ active       │        │  │
│  │  │              │    │              │    │ show_delivery│        │  │
│  │  │              │    │              │    │ show_qrcode  │        │  │
│  │  │              │    │              │    │ show_totem   │        │  │
│  │  │              │    │              │    │ show_tv      │        │  │
│  │  │              │    │              │    │ show_tablet  │        │  │
│  │  └──────────────┘    └──────────────┘    └──────┬───────┘        │  │
│  │                                                  │                │  │
│  │                                                  ▼                │  │
│  │                                          ┌──────────────┐        │  │
│  │                                          │product_options│       │  │
│  │                                          │              │        │  │
│  │                                          │ id           │        │  │
│  │                                          │ product_id   │        │  │
│  │                                          │ name         │        │  │
│  │                                          │ options_json │        │  │
│  │                                          └──────────────┘        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              ORDER SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │  customers   │◄────────│    orders    │────────►│  deliverers  │    │
│  │              │         │              │         │              │    │
│  │ id           │         │ id           │         │ id           │    │
│  │ company_id   │         │ company_id   │         │ company_id   │    │
│  │ name         │         │ customer_id  │         │ name         │    │
│  │ whatsapp     │         │ deliverer_id │         │ whatsapp     │    │
│  │ alerts       │         │ status       │         │ active       │    │
│  │              │         │ total        │         │ access_token │    │
│  └──────┬───────┘         │ payment_method│        └──────────────┘    │
│         │                 │ source       │                              │
│         │                 │ fulfillment  │                              │
│         ▼                 │ table_id     │                              │
│  ┌──────────────┐         └──────┬───────┘                              │
│  │customer_addr │                │                                      │
│  │   esses      │                │ 1:N                                  │
│  │              │                ▼                                      │
│  │ id           │         ┌──────────────┐                              │
│  │ customer_id  │         │ order_items  │                              │
│  │ street       │         │              │                              │
│  │ number       │         │ id           │                              │
│  │ neighborhood │         │ order_id     │                              │
│  │ city         │         │ product_id   │                              │
│  │ latitude     │         │ product_name │                              │
│  │ longitude    │         │ quantity     │                              │
│  │              │         │ unit_price   │                              │
│  └──────────────┘         │ options_json │                              │
│                           │ notes        │                              │
│                           └──────────────┘                              │
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐                              │
│  │    tables    │         │ table_events │                              │
│  │              │         │              │                              │
│  │ id           │         │ id           │                              │
│  │ company_id   │◄────────│ table_id     │                              │
│  │ number       │         │ event_type   │                              │
│  │ name         │         │ status       │                              │
│  │ status       │         │ notes        │                              │
│  │ active       │         │              │                              │
│  └──────────────┘         └──────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           TV & BANNERS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐                              │
│  │  tv_screens  │◄────────│   banners    │                              │
│  │              │         │              │                              │
│  │ id           │         │ id           │                              │
│  │ company_id   │         │ company_id   │                              │
│  │ name         │         │ tv_screen_id │                              │
│  │ token        │         │ image_url    │                              │
│  │ is_active    │         │ title        │                              │
│  │ show_banners │         │ description  │                              │
│  │ show_products│         │ display_order│                              │
│  │ rotation_sec │         │ active       │                              │
│  │              │         │ source       │                              │
│  └──────────────┘         │ ai_reason    │                              │
│                           └──────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           GAMIFICATION                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐                              │
│  │    prizes    │◄────────│  prize_wins  │                              │
│  │              │         │              │                              │
│  │ id           │         │ id           │                              │
│  │ company_id   │         │ company_id   │                              │
│  │ name         │         │ prize_id     │                              │
│  │ type         │         │ customer_name│                              │
│  │ value        │         │ customer_phone│                             │
│  │ probability  │         │ redeemed     │                              │
│  │ active       │         │ redeemed_at  │                              │
│  │ quantity     │         │              │                              │
│  │ used_quantity│         │              │                              │
│  └──────────────┘         └──────────────┘                              │
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │loyalty_config│         │customer_loyal│         │loyalty_trans │    │
│  │              │         │  ty_points   │         │  actions     │    │
│  │ company_id   │         │              │         │              │    │
│  │ enabled      │         │ customer_id  │         │ customer_id  │    │
│  │ points_per_  │         │ company_id   │         │ company_id   │    │
│  │   real       │         │ current_pts  │         │ points       │    │
│  │ min_points   │         │ total_earned │         │ type         │    │
│  └──────────────┘         └──────────────┘         │ order_id     │    │
│                                                    └──────────────┘    │
│  ┌──────────────┐                                                       │
│  │loyalty_rewar │                                                       │
│  │      ds      │                                                       │
│  │              │                                                       │
│  │ id           │                                                       │
│  │ company_id   │                                                       │
│  │ name         │                                                       │
│  │ points_cost  │                                                       │
│  │ reward_type  │                                                       │
│  │ reward_value │                                                       │
│  └──────────────┘                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           MARKETING & AI                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │  campaigns   │────────►│campaign_msgs │         │campaign_opt_ │    │
│  │              │         │              │         │    outs      │    │
│  │ id           │         │ campaign_id  │         │              │    │
│  │ company_id   │         │ customer_id  │         │ customer_id  │    │
│  │ type         │         │ status       │         │ company_id   │    │
│  │ status       │         │ sent_at      │         │ channel      │    │
│  │ audience_rule│         │ delivered_at │         │ reason       │    │
│  │ message_templ│         │              │         │              │    │
│  │ scheduled_for│         │              │         │              │    │
│  └──────────────┘         └──────────────┘         └──────────────┘    │
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │ai_recommend  │         │ai_chat_msgs  │         │ai_confidence │    │
│  │   ations     │         │              │         │   _scores    │    │
│  │              │         │ company_id   │         │              │    │
│  │ id           │         │ session_id   │         │ company_id   │    │
│  │ company_id   │         │ role         │         │ module       │    │
│  │ title        │         │ content      │         │ score        │    │
│  │ action_type  │         │              │         │ applied_cnt  │    │
│  │ status       │         │              │         │ ignored_cnt  │    │
│  │ applied_at   │         │              │         │              │    │
│  └──────────────┘         └──────────────┘         └──────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              SAAS ADMIN                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │    plans     │◄────────│subscriptions │────────►│   invoices   │    │
│  │              │         │              │         │              │    │
│  │ id           │         │ id           │         │ id           │    │
│  │ name         │         │ company_id   │         │ company_id   │    │
│  │ price_cents  │         │ plan_id      │         │ subscription │    │
│  │ features     │         │ status       │         │   _id        │    │
│  │ limits       │         │ current_peri │         │ amount_cents │    │
│  │ is_active    │         │   od_start   │         │ status       │    │
│  │              │         │ trial_ends_at│         │ paid_at      │    │
│  └──────────────┘         │              │         │              │    │
│                           └──────────────┘         └──────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           DELIVERY CONFIG                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │delivery_fee_ │         │delivery_fee_ │         │delivery_fee_ │    │
│  │   config     │         │   ranges     │         │neighborhoods │    │
│  │              │         │              │         │              │    │
│  │ company_id   │         │ company_id   │         │ company_id   │    │
│  │ mode         │         │ min_km       │         │ neighborhood │    │
│  │ origin_addr  │         │ max_km       │         │ city         │    │
│  │ origin_lat   │         │ fee          │         │ fee          │    │
│  │ origin_lng   │         │ est_minutes  │         │ est_minutes  │    │
│  │ max_distance │         │              │         │              │    │
│  │ fallback_fee │         │              │         │              │    │
│  └──────────────┘         └──────────────┘         └──────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           COMPANY SETTINGS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │company_ai_   │  │company_integ │  │company_kds_  │  │company_mkt │  │
│  │  settings    │  │  rations     │  │  settings    │  │ _settings  │  │
│  │              │  │              │  │              │  │            │  │
│  │ company_id   │  │ company_id   │  │ company_id   │  │ company_id │  │
│  │ chat_enabled │  │ whatsapp_en  │  │ warn_after   │  │ enable_ga4 │  │
│  │ tts_enabled  │  │ pix_enabled  │  │ danger_after │  │ enable_gtm │  │
│  │ daily_limits │  │ pix_key      │  │ max_minutes  │  │ enable_meta│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │company_profi │  │company_publi │  │campaign_sett │                  │
│  │     les      │  │  c_links     │  │    ings      │                  │
│  │              │  │              │  │              │                  │
│  │ company_id   │  │ company_id   │  │ company_id   │                  │
│  │ name         │  │ menu_token   │  │ enabled      │                  │
│  │ permissions  │  │ qrcode_token │  │ days_inactive│                  │
│  │ profile_type │  │ totem_token  │  │ send_window  │                  │
│  │              │  │ tv_token     │  │              │                  │
│  │              │  │ roleta_token │  │              │                  │
│  │              │  │ kds_token    │  │              │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           PUBLIC CHAT                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐                              │
│  │public_chat_  │────────►│public_chat_  │                              │
│  │  sessions    │         │  messages    │                              │
│  │              │         │              │                              │
│  │ id           │         │ id           │                              │
│  │ company_id   │         │ session_id   │                              │
│  │ customer_id  │         │ role         │                              │
│  │ started_at   │         │ content      │                              │
│  │              │         │ created_at   │                              │
│  └──────────────┘         └──────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lista Completa de Tabelas

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `companies` | Empresas/estabelecimentos | ✅ |
| `profiles` | Perfis de usuários | ✅ |
| `user_roles` | Papéis de usuários | ✅ |
| `categories` | Categorias do cardápio | ✅ |
| `subcategories` | Subcategorias | ✅ |
| `products` | Produtos | ✅ |
| `product_options` | Opções de produtos | ✅ |
| `orders` | Pedidos | ✅ |
| `order_items` | Itens dos pedidos | ✅ |
| `customers` | Clientes | ✅ |
| `customer_addresses` | Endereços de clientes | ✅ |
| `customer_preferences` | Preferências de clientes | ✅ |
| `customer_credits` | Créditos de clientes | ✅ |
| `customer_loyalty_points` | Pontos de fidelidade | ✅ |
| `deliverers` | Entregadores | ✅ |
| `tables` | Mesas | ✅ |
| `table_events` | Eventos de mesas | ✅ |
| `banners` | Banners | ✅ |
| `tv_screens` | Telas de TV | ✅ |
| `prizes` | Prêmios da roleta | ✅ |
| `prize_wins` | Ganhadores da roleta | ✅ |
| `campaigns` | Campanhas de marketing | ✅ |
| `campaign_messages` | Mensagens de campanhas | ✅ |
| `campaign_settings` | Configurações de campanhas | ✅ |
| `campaign_opt_outs` | Opt-outs de campanhas | ✅ |
| `cash_closings` | Fechamentos de caixa | ✅ |
| `plans` | Planos SaaS | ✅ |
| `subscriptions` | Assinaturas | ✅ |
| `invoices` | Faturas | ✅ |
| `ai_recommendations` | Recomendações IA | ✅ |
| `ai_recommendation_impacts` | Impacto das recomendações | ✅ |
| `ai_chat_messages` | Mensagens do chat IA | ✅ |
| `ai_confidence_scores` | Scores de confiança IA | ✅ |
| `ai_jobs` | Jobs de IA | ✅ |
| `ai_insight_runs` | Execuções de insights | ✅ |
| `company_ai_settings` | Config IA por empresa | ✅ |
| `company_integrations` | Integrações | ✅ |
| `company_kds_settings` | Config KDS | ✅ |
| `company_marketing_settings` | Config marketing | ✅ |
| `company_profiles` | Perfis de acesso | ✅ |
| `company_public_links` | Links públicos | ✅ |
| `delivery_fee_config` | Config taxa entrega | ✅ |
| `delivery_fee_ranges` | Faixas de distância | ✅ |
| `delivery_fee_neighborhoods` | Bairros | ✅ |
| `loyalty_config` | Config fidelidade | ✅ |
| `loyalty_rewards` | Recompensas fidelidade | ✅ |
| `loyalty_transactions` | Transações fidelidade | ✅ |
| `public_chat_sessions` | Sessões chat público | ✅ |
| `public_chat_messages` | Mensagens chat público | ✅ |

---

## 6. CRUDs e Funcionalidades

### 6.1 Empresas (Companies)

**Hook:** `useCompany.ts`

```typescript
// Operações disponíveis
- Leitura: Busca empresa do usuário logado
- Atualização: Atualiza dados da empresa
- Campos: name, slug, address, phone, whatsapp, logo_url, 
          cover_banner_url, opening_hours, colors, is_active

// Configurações relacionadas
- company_ai_settings
- company_integrations
- company_kds_settings
- company_marketing_settings
- company_public_links
```

### 6.2 Usuários e Perfis

**Hook:** `useProfile.ts`, `useCompanyProfiles.ts`

```typescript
// Perfis de usuário
- Leitura: Busca perfil do usuário autenticado
- Atualização: Atualiza nome, avatar

// Perfis de acesso (Roles)
- CRUD completo para perfis customizados
- Permissões granulares por módulo
- Tipos: admin, manager, employee, deliverer
```

### 6.3 Categorias

**Hook:** `useCategories.ts`

```typescript
// CRUD Completo
- Create: createCategory({ name, active })
- Read: categories[] (array de categorias ativas)
- Update: updateCategory({ id, name, active })
- Delete: deleteCategory(id)

// Campos
interface Category {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 6.4 Subcategorias

**Hook:** `useSubcategories.ts`

```typescript
// CRUD Completo
- Create: createSubcategory({ category_id, name, active })
- Read: subcategories[] 
- Update: updateSubcategory({ id, category_id, name, active })
- Delete: deleteSubcategory(id)

// Campos
interface Subcategory {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  active: boolean;
  display_order: number;
}
```

### 6.5 Produtos

**Hook:** `useProducts.ts`

```typescript
// CRUD Completo
- Create: createProduct({ subcategory_id, name, description, price, ... })
- Read: products[], activeProducts[]
- Update: updateProduct({ id, ...data })
- Delete: deleteProduct(id)

// Campos
interface Product {
  id: string;
  company_id: string;
  subcategory_id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  show_delivery: boolean;
  show_qrcode: boolean;
  show_totem: boolean;
  show_tv: boolean;
  show_tablet: boolean;
  is_highlight: boolean;
  available_quantity: number | null;
  preparation_time_minutes: number;
}

// Opções de produto (adicionais)
- useProductOptions.ts para CRUD de opções
```

### 6.6 Pedidos

**Hook:** `useOrders.ts`

```typescript
// Operações
- Create: createOrder({ customer_id, items, fulfillment, ... })
- Read: orders[] com items, customer, deliverer
- Update Status: updateOrderStatus(id, status)
- Assign Deliverer: assignDeliverer(orderId, delivererId)
- Update Payment: updatePaymentMethod(orderId, method)

// Status do Kanban
type OrderStatus = 
  | 'new'        // Novo
  | 'preparing'  // Preparando
  | 'ready'      // Pronto
  | 'in_route'   // Em rota
  | 'delivered'  // Entregue
  | 'cancelled'; // Cancelado

// Campos
interface Order {
  id: string;
  company_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  delivery_fee: number;
  payment_method: string;
  source: 'delivery' | 'qrcode' | 'totem' | 'phone' | 'tablet';
  fulfillment: 'delivery' | 'pickup' | 'table';
  table_id: string | null;
  deliverer_id: string | null;
  delivery_address: string;
  notes: string;
  items: OrderItem[];
}
```

### 6.7 Clientes

**Hook:** `useCustomers.ts`

```typescript
// CRUD Completo
- Create: createCustomer({ name, whatsapp, alerts })
- Read: customers[]
- Update: updateCustomer({ id, name, whatsapp, alerts })
- Delete: deleteCustomer(id)

// Endereços (useCustomerAddresses.ts)
- Create: createAddress({ customer_id, street, number, ... })
- Read: addresses[]
- Update: updateAddress({ id, ...data })
- Delete: deleteAddress(id)
- Set Default: setDefaultAddress(id)

// Campos
interface Customer {
  id: string;
  company_id: string;
  name: string;
  whatsapp: string;
  alerts: string | null;
  created_at: string;
}

interface CustomerAddress {
  id: string;
  customer_id: string;
  company_id: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string | null;
  cep: string | null;
  reference: string | null;
  label: string | null;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
}
```

### 6.8 Entregadores

**Hook:** `useDeliverers.ts`

```typescript
// CRUD Completo
- Create: createDeliverer({ name, whatsapp, active })
- Read: deliverers[], activeDeliverers[]
- Update: updateDeliverer({ id, name, whatsapp, active })
- Delete: deleteDeliverer(id)

// Campos
interface Deliverer {
  id: string;
  company_id: string;
  name: string;
  whatsapp: string | null;
  active: boolean;
  access_token: string | null;
}

// Acerto de caixa
- Hook: useDelivererSettlement
- Listar pedidos por entregador
- Calcular total a acertar
- Registrar pagamento
```

### 6.9 Mesas

**Hook:** `useTables.ts`

```typescript
// CRUD Completo
- Create: createTable({ number, name, active })
- Read: tables[], activeTables[]
- Update: updateTable({ id, number, name, status, active })
- Delete: deleteTable(id)

// Eventos de mesa
- createEvent({ table_id, event_type, notes })
- resolveEvent(id)

// Campos
interface Table {
  id: string;
  company_id: string;
  number: string;
  name: string | null;
  active: boolean;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
}
```

### 6.10 Banners

**Hook:** `useBanners.ts`

```typescript
// CRUD Completo
- Create: createBanner({ image_url, title, description, ... })
- Read: banners[], activeBanners[]
- Update: updateBanner({ id, ...data })
- Delete: deleteBanner(id)
- Reorder: updateBannerOrder(id, display_order)

// Campos
interface Banner {
  id: string;
  company_id: string;
  tv_screen_id: string | null;
  image_url: string;
  title: string | null;
  description: string | null;
  description_color: string | null;
  description_font: string | null;
  display_order: number;
  active: boolean;
  banner_type: string | null;
  source: 'manual' | 'ai';
  ai_reason: string | null;
}
```

### 6.11 Telas de TV

**Hook:** `useTVScreens.ts`

```typescript
// CRUD Completo
- Create: createScreen({ name, is_active, ... })
- Read: screens[]
- Update: updateScreen({ id, ...data })
- Delete: deleteScreen(id)
- Regenerate Token: regenerateToken(id)

// Campos
interface TVScreen {
  id: string;
  company_id: string;
  name: string;
  token: string;
  is_active: boolean;
  show_banners: boolean;
  show_products: boolean;
  show_time_highlights: boolean;
  rotation_interval_seconds: number;
  product_display_count: number;
}
```

### 6.12 Prêmios (Roleta)

**Hook:** `usePrizes.ts`

```typescript
// CRUD Completo
- Create: createPrize({ name, type, value, probability, ... })
- Read: prizes[], activePrizes[]
- Update: updatePrize({ id, ...data })
- Delete: deletePrize(id)

// Sorteio
- spinWheel(): Prize
- registerWin({ prize_id, customer_name, customer_phone })
- redeemWin(win_id)

// Campos
interface Prize {
  id: string;
  company_id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'product' | 'freebie';
  value: number;
  probability: number; // 0-100
  active: boolean;
  quantity: number | null;
  used_quantity: number;
  valid_until: string | null;
}

interface PrizeWin {
  id: string;
  company_id: string;
  prize_id: string;
  customer_name: string;
  customer_phone: string;
  redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}
```

### 6.13 Campanhas de Marketing

**Hook:** `useCampaigns.ts`

```typescript
// CRUD Completo
- Create: createCampaign({ type, audience_rule, message_template, ... })
- Read: campaigns[]
- Update: updateCampaign({ id, ...data })
- Delete: deleteCampaign(id)
- Send: sendCampaign(id)

// Campos
interface Campaign {
  id: string;
  company_id: string;
  type: 'reactivation' | 'promotion' | 'birthday' | 'custom';
  status: 'draft' | 'scheduled' | 'sending' | 'completed';
  audience_rule: string;
  audience_count: number;
  message_template: string;
  channel: 'whatsapp' | 'sms';
  scheduled_for: string | null;
  send_window_start: string;
  send_window_end: string;
  cta: string | null;
  confidence: 'high' | 'medium' | 'low';
  ai_reason: string | null;
}
```

### 6.14 Sistema de Fidelidade

**Hook:** Implementado em `Loyalty.tsx`

```typescript
// Configuração
interface LoyaltyConfig {
  company_id: string;
  enabled: boolean;
  points_per_real: number;
  min_points_to_redeem: number;
}

// Recompensas
interface LoyaltyReward {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: 'discount' | 'product' | 'freebie';
  reward_value: number | null;
  active: boolean;
}

// Pontos do cliente
interface CustomerLoyaltyPoints {
  customer_id: string;
  company_id: string;
  current_points: number;
  total_earned: number;
  total_redeemed: number;
}

// Transações
interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  company_id: string;
  points: number;
  transaction_type: 'earn' | 'redeem' | 'expire' | 'adjust';
  order_id: string | null;
  reward_id: string | null;
  description: string | null;
}
```

### 6.15 Recomendações IA

**Hook:** `useAIRecommendations.ts`

```typescript
// Operações
- Read: recommendations[]
- Apply: applyRecommendation(id)
- Ignore: ignoreRecommendation(id)
- Generate: generateRecommendations()

// Campos
interface AIRecommendation {
  id: string;
  company_id: string;
  title: string;
  reason: string;
  action_type: 'highlight_product' | 'create_campaign' | 'adjust_price' | ...;
  action_payload_json: object;
  status: 'pending' | 'applied' | 'ignored';
  applied_at: string | null;
  impact_status: 'pending' | 'positive' | 'negative' | 'neutral';
  impact_result: object | null;
}
```

### 6.16 Chat IA Público

**Edge Function:** `public-chat`

```typescript
// Request
interface ChatRequest {
  company_id: string;
  session_id?: string;
  message: string;
  company_info: {
    name: string;
    address?: string;
    whatsapp?: string;
    openingHours?: object;
  };
  menu_items?: Array<{ name: string; price: number }>;
}

// Response
interface ChatResponse {
  reply: string;
  session_id: string;
}

// Tabelas
- public_chat_sessions
- public_chat_messages
```

### 6.17 Configurações de Entrega

**Hook:** `useDeliveryConfig.ts`

```typescript
// Configuração principal
interface DeliveryFeeConfig {
  company_id: string;
  mode: 'fixed' | 'distance' | 'neighborhood';
  origin_address: string | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  max_distance_km: number | null;
  fallback_fee: number;
  allow_manual_override: boolean;
}

// Faixas por distância
interface DeliveryFeeRange {
  id: string;
  company_id: string;
  min_km: number;
  max_km: number;
  fee: number;
  estimated_minutes: number | null;
  active: boolean;
}

// Por bairro
interface DeliveryFeeNeighborhood {
  id: string;
  company_id: string;
  neighborhood: string;
  city: string | null;
  fee: number;
  estimated_minutes: number | null;
  active: boolean;
}
```

### 6.18 Links Públicos

**Hook:** `useCompanyPublicLinks.ts`

```typescript
// Tokens por canal
interface CompanyPublicLinks {
  company_id: string;
  menu_token: string;      // /m/:token
  qrcode_token: string;    // /q/:token
  totem_token: string;     // /t/:token
  tv_token: string;        // /tv/:token
  roleta_token: string;    // /r/:token
  kds_token: string;       // /kds/:token
}

// Operações
- regenerateToken(channel): Regenera token específico
```

---

## 7. Edge Functions

### Lista Completa

| Função | Endpoint | Autenticação | Descrição |
|--------|----------|--------------|-----------|
| `ai-assistant` | POST | JWT | Chat IA interno |
| `ai-campaigns` | POST | JWT | Gerar campanhas IA |
| `ai-chat` | POST | JWT | Chat geral IA |
| `ai-healthcheck` | GET | Nenhuma | Verificar saúde IA |
| `ai-manager` | POST | JWT | IA gestora análises |
| `ai-menu-creative` | POST | JWT | Gerar banners criativos |
| `ai-menu-highlight` | POST | JWT | Destaques de menu |
| `ai-repurchase` | POST | JWT | Análise recompra |
| `ai-tts` | POST | JWT | Text-to-speech |
| `ai-tv-highlight` | POST | JWT | Destaques TV |
| `ai-tv-scheduler` | POST | JWT | Agendar conteúdo TV |
| `ai-whatsapp-suggest` | POST | JWT | Sugestões WhatsApp |
| `analyze-business` | POST | JWT | Análise de negócio |
| `clone-company-menu` | POST | JWT | Clonar cardápio |
| `process-status-notifications` | POST | Webhook | Processar notificações |
| `public-chat` | POST | Nenhuma | Chat público IA |
| `public-create-order` | POST | Nenhuma | Criar pedido público |
| `run-qa-tests` | POST | JWT | Executar testes QA |
| `send-whatsapp` | POST | JWT | Enviar WhatsApp |
| `send-whatsapp-direct` | POST | JWT | WhatsApp direto |
| `test-token-stability` | POST | JWT | Testar tokens |
| `test-tv` | POST | JWT | Testar TV |
| `webhook-asaas` | POST | Webhook | Webhook Asaas |
| `webhook-mercadopago` | POST | Webhook | Webhook MercadoPago |
| `webhook-whatsapp` | POST | Webhook | Webhook WhatsApp |

### Exemplo: public-create-order

```typescript
// Request
POST /functions/v1/public-create-order

{
  "company_id": "uuid",
  "customer_name": "João Silva",
  "customer_phone": "11999999999",
  "items": [
    {
      "product_id": "uuid",
      "product_name": "X-Burger",
      "quantity": 2,
      "unit_price": 25.90,
      "notes": "Sem cebola",
      "options": []
    }
  ],
  "fulfillment": "delivery",
  "delivery_address": "Rua X, 123",
  "delivery_fee": 5.00,
  "payment_method": "pix",
  "notes": "Troco para 100",
  "source": "delivery"
}

// Response
{
  "success": true,
  "order_id": "uuid",
  "order_number": 1234
}
```

---

## 8. Rotas da Aplicação

### Rotas Administrativas (Autenticadas)

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/` | `Dashboard` | Painel principal |
| `/dashboard` | `Dashboard` | Painel principal |
| `/orders` | `Orders` | Gestão de pedidos (Kanban) |
| `/phone-order` | `PhoneOrder` | Novo pedido por telefone |
| `/tables` | `Tables` | Gestão de mesas |
| `/kds` | `KDS` | Kitchen Display System |
| `/products` | `Products` | Gestão de produtos |
| `/categories` | `Categories` | Gestão de categorias |
| `/subcategories` | `Subcategories` | Gestão de subcategorias |
| `/customers` | `Customers` | Gestão de clientes |
| `/deliverers` | `Deliverers` | Gestão de entregadores |
| `/deliverer-settlement` | `DelivererSettlement` | Acerto de caixa |
| `/banners` | `Banners` | Gestão de banners |
| `/tv-screens` | `TVScreens` | Configuração de TVs |
| `/prizes` | `Prizes` | Gestão de prêmios |
| `/campaigns` | `Campaigns` | Campanhas de marketing |
| `/whatsapp` | `WhatsApp` | Templates WhatsApp |
| `/marketing` | `Marketing` | Configurações marketing |
| `/loyalty` | `Loyalty` | Sistema de fidelidade |
| `/reports` | `Reports` | Relatórios avançados |
| `/ai-recommendations` | `AIRecommendations` | Recomendações IA |
| `/ai-suggestions` | `AISuggestions` | Sugestões IA |
| `/ai-menu-creative` | `AIMenuCreative` | Banners criativos IA |
| `/ai-tv-scheduler` | `AITVScheduler` | Agendador TV IA |
| `/repurchase` | `Repurchase` | Análise recompra |
| `/my-links` | `MyLinks` | Links públicos |
| `/users` | `Users` | Gestão de usuários |
| `/profiles` | `Profiles` | Perfis de acesso |
| `/company` | `Company` | Dados da empresa |
| `/settings/*` | `SettingsLayout` | Configurações |
| `/qa` | `QA` | Testes de qualidade |
| `/onboarding` | `Onboarding` | Onboarding inicial |

### Rotas SaaS Admin

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/saas/dashboard` | `SaasDashboard` | Dashboard SaaS |
| `/saas/companies` | `SaasCompanies` | Lista de empresas |
| `/saas/companies/:id` | `SaasCompanyDetails` | Detalhes empresa |
| `/saas/plans` | `SaasPlans` | Gestão de planos |
| `/saas/subscriptions` | `SaasSubscriptions` | Assinaturas |
| `/saas/templates` | `SaasTemplates` | Templates |
| `/saas/audit` | `SaasAudit` | Auditoria |

### Rotas Públicas (Token)

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/m/:token` | `PublicMenuByToken` | Menu delivery |
| `/q/:token` | `PublicMenuByToken` | Menu QR Code |
| `/t/:token` | `PublicMenuByToken` | Menu Totem |
| `/tv/:token` | `PublicTVByToken` | Tela TV |
| `/r/:token` | `PublicRoletaByToken` | Roleta de prêmios |
| `/kds/:token` | `PublicKDSByToken` | KDS público |
| `/deliverer/:token` | `DelivererApp` | App entregador |
| `/menu/:slug` | `DeliveryMenu` | Menu por slug |
| `/blocked` | `Blocked` | Empresa bloqueada |
| `/auth` | `Auth` | Login/Registro |

---

## 9. Hooks Personalizados

### Dados e CRUD

| Hook | Descrição |
|------|-----------|
| `useOrders` | CRUD pedidos + realtime |
| `useProducts` | CRUD produtos |
| `useCategories` | CRUD categorias |
| `useSubcategories` | CRUD subcategorias |
| `useCustomers` | CRUD clientes |
| `useCustomerAddresses` | CRUD endereços |
| `useDeliverers` | CRUD entregadores |
| `useBanners` | CRUD banners |
| `useTables` | CRUD mesas |
| `useTVScreens` | CRUD telas TV |
| `usePrizes` | CRUD prêmios |
| `useCampaigns` | CRUD campanhas |
| `useCompany` | Dados empresa |
| `useProfile` | Perfil usuário |
| `useCompanyProfiles` | Perfis de acesso |

### Configurações

| Hook | Descrição |
|------|-----------|
| `useCompanySettings` | Config geral |
| `useDeliveryConfig` | Config entrega |
| `useKDSSettings` | Config KDS |
| `useMarketingSettings` | Config marketing |
| `useOnlineMenuSettings` | Config menu online |
| `useCompanyPublicLinks` | Links públicos |

### IA e Análises

| Hook | Descrição |
|------|-----------|
| `useAIRecommendations` | Recomendações IA |
| `useAISuggestions` | Sugestões vendas |
| `useApplyRecommendation` | Aplicar recomendação |
| `useConfidenceScores` | Scores de confiança |
| `useImpactMeasurement` | Medir impacto |
| `useCustomerEngagement` | Engajamento |

### Utilitários

| Hook | Descrição |
|------|-----------|
| `useCompanyAccess` | Verificar acesso |
| `useCompanyAccessBySlug` | Acesso por slug |
| `useMenuByToken` | Menu por token |
| `usePublicCompany` | Dados públicos |
| `usePublicCustomer` | Cliente público |
| `usePublicDeliveryFee` | Taxa entrega pública |
| `useOrderNotification` | Som de notificação |
| `useOrderStatusEvents` | Eventos de status |
| `useCashClosing` | Fechamento de caixa |
| `usePrintSectors` | Setores impressão |
| `useRegenerateToken` | Regenerar tokens |
| `useSubscriptionWarning` | Aviso assinatura |
| `useTTS` | Text-to-speech |
| `useTimeHighlights` | Destaques por horário |
| `useWhatsAppMessages` | Mensagens WhatsApp |
| `useWhatsAppTemplates` | Templates WhatsApp |
| `useRepurchase` | Análise recompra |
| `useSaasAdmin` | Admin SaaS |
| `useSaasCompanyCreate` | Criar empresa SaaS |

---

## 10. Componentes Principais

### Layout

| Componente | Descrição |
|------------|-----------|
| `DashboardLayout` | Layout principal com sidebar |
| `AppSidebar` | Navegação lateral |
| `SaasLayout` | Layout admin SaaS |
| `SettingsLayout` | Layout configurações |

### Pedidos

| Componente | Descrição |
|------------|-----------|
| `OrderCard` | Card de pedido no Kanban |
| `KanbanColumn` | Coluna do Kanban |
| `CashClosingDialog` | Dialog fechamento caixa |
| `SectorPrintMenu` | Menu impressão por setor |

### Menu

| Componente | Descrição |
|------------|-----------|
| `ProductCard` | Card de produto |
| `CartButton` | Botão do carrinho |
| `CartSheet` | Sheet do carrinho/checkout |
| `SalesSuggestions` | Sugestões de venda IA |

### KDS

| Componente | Descrição |
|------------|-----------|
| `KDSLayout` | Layout do KDS |
| `KDSOrderCard` | Card de pedido no KDS |

### Público

| Componente | Descrição |
|------------|-----------|
| `PublicChatWidget` | Widget chat IA |
| `StoreUnavailable` | Loja indisponível |
| `PrizeWheel` | Roleta de prêmios |

### Marketing

| Componente | Descrição |
|------------|-----------|
| `MarketingScripts` | Scripts GA4/GTM/Pixel |
| `SocialLinks` | Links redes sociais |

---

## 11. Fluxos de Negócio

### Fluxo de Pedido (Delivery)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────►│   Cardápio  │────►│  Carrinho   │
│ acessa /m/  │     │   digital   │     │   (Cart)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Entregador │◄────│   Kanban    │◄────│  Checkout   │
│  recebe     │     │   Pedidos   │     │  (Order)    │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │    KDS      │
       │            │  (Cozinha)  │
       │            └──────┬──────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│   Entrega   │────►│  Entregue   │
│  (in_route) │     │ (delivered) │
└─────────────┘     └─────────────┘
```

### Fluxo de Pedido (Mesa)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────►│   QR Code   │────►│  Carrinho   │
│ escaneia QR │     │   Cardápio  │     │   (Cart)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Garçom    │◄────│    KDS      │◄────│   Pedido    │
│  entrega    │     │  (Cozinha)  │     │  (mesa)     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Fluxo da Roleta

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────►│   Roleta    │────►│   Girar     │
│ acessa /r/  │     │   Pública   │     │   Roda      │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Resgatar   │◄────│  Cadastrar  │◄────│   Prêmio    │
│   Prêmio    │     │   Dados     │     │  Sorteado   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Fluxo de Fidelidade

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────►│   Pedido    │────►│   Pontos    │
│   compra    │     │  finalizado │     │  creditados │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Desconto   │◄────│   Resgatar  │◄────│  Acumula    │
│  aplicado   │     │  Recompensa │     │   pontos    │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 12. Integrações

### WhatsApp

```typescript
// Configuração
interface WhatsAppConfig {
  provider: 'evolution' | 'z-api' | 'twilio';
  instance_id: string;
  api_key: string; // Secret
  default_number: string;
}

// Envio de mensagem
POST /functions/v1/send-whatsapp
{
  company_id: string;
  phone: string;
  message: string;
  template?: string;
}
```

### Pagamentos

```typescript
// MercadoPago
POST /functions/v1/webhook-mercadopago
// Processa pagamentos PIX/Cartão

// Asaas
POST /functions/v1/webhook-asaas
// Processa assinaturas e faturas
```

### Analytics

```typescript
// Configuração por empresa
interface MarketingSettings {
  enable_ga4: boolean;
  ga4_measurement_id: string;
  enable_gtm: boolean;
  gtm_container_id: string;
  enable_meta_pixel: boolean;
  meta_pixel_id: string;
}
```

---

## 13. Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado com políticas:

```sql
-- Política padrão para SELECT
CREATE POLICY "Users can view own company data"
ON table_name FOR SELECT
USING (company_id IN (
  SELECT company_id FROM user_roles 
  WHERE user_id = auth.uid()
));

-- Política padrão para INSERT
CREATE POLICY "Users can insert own company data"
ON table_name FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM user_roles 
  WHERE user_id = auth.uid()
));

-- Política padrão para UPDATE
CREATE POLICY "Users can update own company data"
ON table_name FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM user_roles 
  WHERE user_id = auth.uid()
));

-- Política padrão para DELETE
CREATE POLICY "Users can delete own company data"
ON table_name FOR DELETE
USING (company_id IN (
  SELECT company_id FROM user_roles 
  WHERE user_id = auth.uid()
));
```

### Autenticação

```typescript
// AuthContext.tsx
interface AuthContext {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Proteção de rotas
<Route element={<CompanyAccessGuard />}>
  <Route path="/dashboard" element={<Dashboard />} />
  {/* ... outras rotas protegidas */}
</Route>
```

### Validação de Tokens

```typescript
// tokenValidation.ts
function validateTokenPrefix(token: string, expectedPrefix: string): boolean {
  return token.startsWith(expectedPrefix);
}

// Prefixos por canal
const TOKEN_PREFIXES = {
  menu: 'menu_',
  qrcode: 'qr_',
  totem: 'tot_',
  tv: 'tv_',
  roleta: 'rol_',
  kds: 'kds_',
};
```

---

## Apêndice: Enums do Sistema

```typescript
// Status de pedido
type OrderStatus = 
  | 'new'
  | 'preparing'
  | 'ready'
  | 'in_route'
  | 'delivered'
  | 'cancelled';

// Papel de usuário
type AppRole = 'admin' | 'employee';

// Perfil de loja
type StoreProfile = 
  | 'restaurant'
  | 'pizzeria'
  | 'bakery'
  | 'cafe'
  | 'bar'
  | 'food_truck'
  | 'other';

// Tipo de perfil de acesso
type ProfileType = 
  | 'admin'
  | 'manager'
  | 'cashier'
  | 'waiter'
  | 'kitchen'
  | 'deliverer';

// Fonte do pedido
type OrderSource = 
  | 'delivery'
  | 'qrcode'
  | 'totem'
  | 'phone'
  | 'tablet';

// Tipo de cumprimento
type FulfillmentType = 
  | 'delivery'
  | 'pickup'
  | 'table';

// Forma de pagamento
type PaymentMethod = 
  | 'cash'
  | 'credit'
  | 'debit'
  | 'pix'
  | 'voucher';
```

---

## Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2024-12-28 | 1.0.0 | Documentação inicial completa |

---

*Documento gerado para análise via GPT/IA. Contém toda a estrutura do sistema Zoopi.*
