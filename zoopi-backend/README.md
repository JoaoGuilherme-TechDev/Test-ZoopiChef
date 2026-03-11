🚀 Zoopi - SaaS Multi-tenant para Restaurantes
📝 Descrição do Projeto
O Zoopi é uma plataforma SaaS (Software as a Service) completa para gestão de estabelecimentos gastronômicos (pizzarias, restaurantes, delivery). O sistema foi concebido originalmente em uma arquitetura BaaS (Backend as a Service) com Supabase, e está atualmente em processo de migração para uma Arquitetura Enterprise mais robusta, separando totalmente o Frontend do Backend.
Funcionalidades Core (Status: Operacional no MVP):
Cardápio Digital: Delivery, TV Menu, QR Code e Totem.
Operação: Kanban de pedidos (KDS), gestão de entregadores com App PWA próprio.
Financeiro: Fluxo de caixa, controle de "Fiado" (conta corrente) e Plano de Contas.
Marketing & IA: Módulos de IA para recomendações de negócio, criação de cardápio e campanhas automáticas.
🏗️ Estado Atual da Migração (Fevereiro/2026)

1. Backend (Novo)
   Framework: NestJS (Node.js).
   Estrutura: Modularizada, seguindo princípios SOLID.
   Prefixos: Global prefix configurado para /api.
   CORS: Habilitado para integração com o Frontend React.
2. Banco de Dados Próprio
   Motor: PostgreSQL 16 rodando via Docker Desktop.
   Container: zoopi-db.
   Porta Local: 5444 (alterada para evitar conflitos com Postgres nativo do Windows).
   URL de Conexão: postgresql://postgres:password123@localhost:5444/zoopi_db?schema=public.
3. O que foi feito até agora:
   Criação do projeto zoopi-backend.
   Configuração do ambiente Docker para o banco de dados.
   Definição inicial das tabelas fundamentais: companies (Tenants) e profiles (Usuários).
   Implementação do módulo Companies (CRUD base).
   Decisão Técnica Crítica: Após conflitos de configuração e tipagem com o Prisma 7.3.0, decidimos abortar o uso do Prisma e migrar para o Drizzle ORM, visando maior controle, performance e estabilidade no ambiente Windows.
   🛠️ Próximos Passos (O que falta fazer)
   Prioridade 1: Infraestrutura de Dados (Drizzle)

Executar a limpeza total dos pacotes Prisma.

Instalar e configurar o Drizzle ORM com o driver pg.

Mapear os schemas de companies e profiles no padrão Drizzle.

Executar a primeira migration para criar as tabelas no Docker.
Prioridade 2: Lógica de Negócio e Segurança

Migrar a lógica das Edge Functions do Supabase para Services no NestJS.

Implementar autenticação via JWT (substituindo o Supabase Auth).

Implementar o isolamento Multi-tenant (garantir que uma empresa nunca veja dados de outra).
Prioridade 3: Integração Frontend

Criar um cliente API (Axios) no React apontando para o novo Backend.

Substituir gradualmente os hooks useSupabase por hooks que consomem a nova API NestJS.
⚠️ Notas de Contexto para a IA (Importante)
Ambiente: Windows (PowerShell). Comandos && não funcionam, devem ser enviados um por vez.
Regra de Ouro: Não alterar a lógica original do sistema. A migração deve ser funcionalmente idêntica ao que já existe no Supabase, apenas mudando a "carcaça" técnica para algo mais robusto.
Estratégia de Banco: O banco deve ser multi-tenant baseado em company_id em todas as tabelas.


# 📋 Documentação Completa da Arquitetura do Projeto — ZOOPI PDV SaaS

> Gerada em: 2026-02-09  
> Stack: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), TanStack Query, React Router v6, Supabase (Lovable Cloud), Framer Motion, Recharts

---

## 📁 Estrutura de Diretórios

```
src/
├── assets/              # Imagens e arquivos estáticos importados via ES6
├── components/          # Componentes reutilizáveis organizados por domínio
│   ├── layout/          # Layout principal (Sidebar, Header, Footer, Search)
│   ├── dashboard/       # Widgets do Dashboard (tempo real)
│   ├── ui/              # Primitivos shadcn/ui (Button, Dialog, Card, etc.)
│   ├── orders/          # Listeners de pedidos (AutoPrint, Sound, etc.)
│   ├── panic/           # Botão de pânico e listeners globais
│   ├── notifications/   # Centro de notificações
│   ├── onboarding/      # Wizard de onboarding
│   ├── auth/            # Formulários de login/registro
│   ├── guards/          # Guards de acesso (CompanyAccessGuard)
│   ├── saas/            # Componentes SaaS (CompanySelector)
│   ├── pwa/             # Componentes PWA (install prompt, manifests)
│   ├── ... (40+ pastas por domínio)
│   ├── ErrorBoundary.tsx
│   ├── NavLink.tsx
│   └── ThemeToggle.tsx
├── contexts/            # Context Providers globais
│   ├── AuthContext.tsx           # Autenticação (login, logout, sessão)
│   ├── CompanyContext.tsx        # Empresa ativa + modo SaaS Admin
│   ├── CartContext.tsx           # Carrinho (público)
│   ├── TenantContext.tsx         # Contexto tenant para rotas /:slug
│   ├── WaiterSessionContext.tsx  # Sessão garçom PWA
│   ├── PizzaKDSSessionContext.tsx
│   └── PizzaKdsV2SessionContext.tsx
├── hooks/               # Custom hooks (250+ hooks)
├── integrations/        # Supabase client e types (auto-gerados, NÃO editar)
├── layouts/             # Layouts específicos (WaiterPWALayout)
├── lib/                 # Utilitários (queryClient, errorMonitoring, utils)
├── modules/             # Módulos isolados com suas próprias pages/hooks/components
│   ├── backup/
│   ├── batch-operations/
│   ├── crm/
│   ├── employees/
│   ├── erp-inventory/
│   ├── finance-erp/
│   ├── fiscal/
│   ├── help-center/
│   ├── integrations/
│   ├── marketing/
│   ├── marketplace/
│   ├── multi-store/
│   ├── products/
│   ├── reports/
│   ├── rotisseur/
│   ├── routing/
│   ├── saas-subscriptions/
│   ├── sales-projection/
│   ├── smart-purchasing/
│   └── sommelier/
├── pages/               # Páginas do sistema (200+ páginas)
│   ├── tenant/          # Rotas públicas /:slug/:app
│   ├── pwa/             # PWAs isoladas
│   ├── settings/        # Sub-páginas de configuração
│   ├── saas/            # Admin SaaS
│   ├── reseller/        # Painel revendedor
│   ├── admin/           # Admin avançado
│   ├── reports/         # Relatórios
│   ├── public/          # Páginas públicas (fila, waitlist)
│   ├── waiter/          # PWA Garçom
│   ├── entregador/      # PWA Entregador
│   └── ... (150+ páginas individuais)
├── stores/              # State stores (se necessário)
├── utils/               # Funções utilitárias
├── App.tsx              # Roteamento principal
├── main.tsx             # Entry point
└── index.css            # Design system completo (tokens, animações, sidebar)
```

---

## 🏗️ Arquitetura Geral

### Padrão de Camadas

```
┌─────────────────────────────────────────────┐
│                  App.tsx                      │
│  (BrowserRouter + Providers + Routes)        │
├─────────────────────────────────────────────┤
│              Contexts (Providers)             │
│  AuthProvider → CompanyProvider →             │
│  CompanyAccessGuard → ProactiveAgentProvider  │
├─────────────────────────────────────────────┤
│              Layout Layer                    │
│  DashboardLayout (Sidebar + Header + Main)   │
├─────────────────────────────────────────────┤
│              Pages (Rotas)                   │
│  Dashboard, Orders, Products, KDS, etc.      │
├─────────────────────────────────────────────┤
│         Modules (Domínios Isolados)          │
│  finance-erp, crm, fiscal, sommelier, etc.   │
├─────────────────────────────────────────────┤
│            Hooks + Services                  │
│  250+ hooks de dados/lógica                  │
├─────────────────────────────────────────────┤
│          Supabase (Lovable Cloud)            │
│  PostgreSQL + RLS + Realtime + Edge Funcs    │
└─────────────────────────────────────────────┘
```

### Provider Wrapping (App.tsx)

```
QueryClientProvider
  └─ ThemeProvider (next-themes, dark default)
       └─ TooltipProvider
            └─ BrowserRouter
                 ├─ [Rotas PWA isoladas - SEM AuthProvider]
                 │   /:slug/totem, /:slug/garcom, /pwa/*, etc.
                 │
                 └─ AuthProvider
                      └─ CompanyProvider
                           └─ CompanyAccessGuard
                                └─ ProactiveAgentProvider
                                     └─ [Todas as rotas autenticadas]
```

---

## 🎨 Layout Principal — `DashboardLayout`

**Arquivo:** `src/components/layout/DashboardLayout.tsx`

É o wrapper de todas as páginas internas autenticadas. Estrutura:

```
┌─────────────────────────────────────────────────────┐
│ SidebarProvider                                      │
│  ├─ SubscriptionWarningBanner (topo global)          │
│  ├─ SubscriptionExpiryNotice                         │
│  ├─ AutoPrintListener (background)                   │
│  ├─ OrderSoundListener (background)                  │
│  ├─ PrintFailureAlert (background)                   │
│  ├─ OnboardingWizard (modal)                         │
│  ├─ GlobalPanicListener (background)                 │
│  │                                                   │
│  ├─ AppSidebar ◄── Menu lateral                      │
│  │                                                   │
│  └─ SidebarInset (área principal)                    │
│       ├─ HEADER (h-16, border-b, bg-card)            │
│       │   ├─ SidebarTrigger (hamburger)              │
│       │   ├─ Separator                               │
│       │   ├─ Título da página (opcional)             │
│       │   ├─ GlobalSearch (centro)                   │
│       │   ├─ CompanyLinksDropdown                    │
│       │   ├─ KeyboardShortcuts                       │
│       │   ├─ OnlineStatusIndicator                   │
│       │   ├─ HelpCenterAdvanced                      │
│       │   ├─ NotificationCenter                      │
│       │   ├─ ThemeToggle                             │
│       │   └─ PanicButton                             │
│       │                                              │
│       ├─ MAIN (flex-1, p-6, bg-background)           │
│       │   └─ {children} ◄── Conteúdo da página       │
│       │                                              │
│       └─ SystemFooter                                │
└─────────────────────────────────────────────────────┘
```

### Componentes do Header

| Componente | Descrição |
|---|---|
| `SidebarTrigger` | Botão hamburger para abrir/fechar sidebar |
| `GlobalSearch` | Busca global indexando produtos, clientes, pedidos, categorias |
| `CompanyLinksDropdown` | Dropdown com links externos ativos da empresa |
| `KeyboardShortcuts` | Atalhos de teclado |
| `OnlineStatusIndicator` | Indicador de status online/offline |
| `HelpCenterAdvanced` | Centro de ajuda avançado |
| `NotificationCenter` | Centro de notificações |
| `ThemeToggle` | Alternância dark/light mode |
| `PanicButton` | Botão de emergência operacional |

### Listeners de Background

| Listener | Função |
|---|---|
| `AutoPrintListener` | Impressão automática de pedidos (polling 45s) |
| `OrderSoundListener` | Sons de notificação de novos pedidos |
| `PrintFailureAlert` | Alertas de falhas de impressão |
| `GlobalPanicListener` | Listener global de atalho de pânico |
| `OnboardingWizard` | Wizard de onboarding para novos usuários |

---

## 📐 Sidebar — `AppSidebar`

**Arquivo:** `src/components/layout/AppSidebar.tsx`  
**Estilo CSS:** Classes `sidebar-futuristic`, `sidebar-item-futuristic`, `sidebar-group-label-futuristic` (definidas em `index.css`)

### Estrutura

```
Sidebar (sidebar-futuristic)
├─ SidebarHeader
│   ├─ CompanySelector (se canAccessAllCompanies)
│   └─ Logo + Nome da empresa
│
├─ SidebarContent (scrollable, px-2)
│   ├─ Grupo: Principal (27 itens)
│   ├─ Grupo: Financeiro (11 itens)
│   ├─ Grupo: ERP / Estoque (11 itens)
│   ├─ Grupo: Cardápio (14 itens)
│   ├─ Grupo: Gestão RH/Ativos (6 itens)
│   ├─ Grupo: Logística/Compras (3 itens)
│   ├─ Grupo: Fiscal (3 itens)
│   ├─ Grupo: Multi-Lojas (1 item)
│   ├─ Grupo: Integrações (6 itens)
│   ├─ Grupo: CRM (4 itens)
│   ├─ Grupo: TV Display (2 itens) — condicional: module_tv
│   ├─ Grupo: Marketing (12 itens) — condicional: module_marketing
│   ├─ Grupo: IA (9 itens) — condicional: module_ai
│   ├─ Grupo: Configurações (26 itens)
│   ├─ Grupo: Revendedor — condicional: isRevendedor && !isSuperAdmin
│   ├─ Grupo: Gestão Revendedores — condicional: isSuperAdmin
│   └─ Grupo: Admin SaaS — condicional: isSaasAdmin
│
└─ SidebarFooter
    ├─ Avatar + Nome + Email do usuário
    ├─ Botão Logout
    └─ SystemVersion
```

### Funcionalidades

- **Drag & Drop:** Admins podem reordenar itens via drag-and-drop (hook `useMenuOrder`)
- **Filtros por módulo:** Itens são filtrados pelo `useCompanyModules` (mesas, comandas, self-checkout, etc.)
- **Scroll persistente:** Posição de scroll salva em `sessionStorage`
- **Active state:** Destaque visual com barra lateral azul (3px) e background azul translúcido
- **Animações:** Framer Motion com `staggerChildren` nos grupos e items

### Estilos da Sidebar (index.css)

```css
.sidebar-futuristic          — Background deep blue, borda com gradient strip (3px) na borda direita
.sidebar-item-futuristic     — Hover com barra lateral azul animada, estados active/hover
.sidebar-icon-futuristic     — Ícones com transição de cor ao hover/active
.sidebar-group-label-futuristic — Labels uppercase, tracking wide, cor cinza-azulada
.sidebar-group-indicator     — Bolinha colorida com glow pulsante
.sidebar-logo-container      — Container com borda sutil para logo
.sidebar-avatar-futuristic   — Avatar com ring gradient (violet → blue)
.sidebar-logout-futuristic   — Botão logout com glow vermelho no hover
.sidebar-footer-futuristic   — Footer com borda e background mais escuro
.company-selector-futuristic — Seletor com borda glow no hover
```

---

## 📊 Dashboard — `/dashboard`

**Arquivo:** `src/pages/Dashboard.tsx`  
**Hook de dados:** `useDashboardRealtime` (polling 60s, sem refetchOnWindowFocus)

### Layout do Dashboard

```
DashboardLayout(title="Dashboard")
├─ Welcome Header (gradient-primary, rounded-xl)
│   ├─ Saudação com nome do usuário
│   ├─ Nome da empresa
│   ├─ Data atual
│   ├─ Badge "Tempo Real" (pulsante)
│   └─ Botão Refresh
│
├─ Row 1: Pedidos + Caixa (grid lg:2)
│   ├─ RealtimeOrdersWidget
│   └─ RealtimeCashWidget
│
├─ Row 2: Mesas e Comandas
│   └─ RealtimeTablesWidget
│
├─ Row 3: Métricas de Performance
│   └─ RealtimeMetricsWidget
│
├─ Row 4: Financeiro + Estoque (grid lg:2)
│   ├─ RealtimeFinancialsWidget
│   └─ RealtimeInventoryWidget
│
├─ Row 5: Gráficos Visuais
│   └─ DashboardChartsSection (Pizza: pagamentos/ocupação, Barras: volume/balanço)
│
├─ Row 6: Performance Widgets (grid md:2 lg:4)
│   ├─ DailyGoalWidget (meta diária de tempo médio)
│   ├─ KitchenLoadWidget (carga cozinha)
│   ├─ AIInsightsWidget (insights IA)
│   └─ NextActionsWidget (próximas ações)
│
├─ Acesso Rápido (8 botões em grid)
│   Terminal, Produtos, Pedidos, Caixa, Entregas, Tempos, TV, IA Gestora
│
├─ GamifiedProgress (onboarding gamificado, compact)
│
└─ Warning: Empresa não configurada (se !company)
```

### Widgets do Dashboard

| Widget | Arquivo | Dados |
|---|---|---|
| `RealtimeOrdersWidget` | `dashboard/RealtimeOrdersWidget.tsx` | Pedidos ativos, pendentes, em produção |
| `RealtimeCashWidget` | `dashboard/RealtimeCashWidget.tsx` | Status do caixa, movimentações, exclusões |
| `RealtimeTablesWidget` | `dashboard/RealtimeTablesWidget.tsx` | Mesas ocupadas/livres, comandas ativas |
| `RealtimeMetricsWidget` | `dashboard/RealtimeMetricsWidget.tsx` | Tempo médio, ticket médio, taxa de entrega |
| `RealtimeFinancialsWidget` | `dashboard/RealtimeFinancialsWidget.tsx` | Faturamento, despesas, lucro |
| `RealtimeInventoryWidget` | `dashboard/RealtimeInventoryWidget.tsx` | Alertas de estoque, itens críticos |
| `DashboardChartsSection` | `dashboard/DashboardChartsSection.tsx` | Gráficos Recharts (Pizza + Barras) |
| `DailyGoalWidget` | `dashboard/DailyGoalWidget.tsx` | Meta diária de tempo médio atendimento |
| `KitchenLoadWidget` | `dashboard/KitchenLoadWidget.tsx` | Carga atual da cozinha |
| `AIInsightsWidget` | `dashboard/AIInsightsWidget.tsx` | Insights de IA operacional |
| `NextActionsWidget` | `dashboard/NextActionsWidget.tsx` | Próximas ações recomendadas |

---

## 🎨 Design System (Estilos)

### Tema: "ZOOPI PDV — Royal Blue & Violet"

O sistema possui 3 temas definidos em `index.css`:
- **`:root`** — Tema padrão (deep blue)
- **`.light`** — Modo claro
- **`.dark`** — Modo escuro com alto contraste para PDV

### Tokens CSS (variáveis)

#### Cores Semânticas Principais

| Token | Dark (HSL) | Uso |
|---|---|---|
| `--background` | `232 50% 6%` | Fundo geral |
| `--foreground` | `0 0% 100%` | Texto principal (branco puro) |
| `--card` | `232 45% 10%` | Superfície de cards |
| `--primary` | `220 95% 58%` | Azul Royal (botões, links, accent) |
| `--accent` | `265 90% 62%` | Violeta brilhante (destaques) |
| `--secondary` | `255 40% 16%` | Violeta escuro |
| `--muted` | `240 35% 12%` | Backgrounds sutis |
| `--muted-foreground` | `225 25% 65%` | Texto secundário |
| `--destructive` | `0 85% 58%` | Vermelho (ações destrutivas) |
| `--border` | `235 40% 22%` | Bordas |
| `--success` | `150 85% 48%` | Verde (sucesso) |
| `--warning` | `42 100% 55%` | Amarelo (aviso) |
| `--info` | `210 100% 58%` | Azul claro (informação) |

#### Cores "Neon" (Sidebar e acentos)

| Token | Valor | Uso |
|---|---|---|
| `--neon-green` | `220 95% 58%` | Mapeado para azul (legado) |
| `--neon-cyan` | `200 90% 58%` | Ciano |
| `--neon-blue` | `220 100% 62%` | Azul vibrante |
| `--neon-purple` | `265 90% 62%` | Violeta principal |
| `--neon-pink` | `285 85% 60%` | Rosa-violeta |
| `--neon-orange` | `28 100% 58%` | Laranja |
| `--neon-teal` | `210 90% 55%` | Teal |

#### Sidebar

| Token | Valor |
|---|---|
| `--sidebar-background` | `235 52% 5%` |
| `--sidebar-foreground` | `0 0% 95%` |
| `--sidebar-primary` | `220 95% 58%` |
| `--sidebar-border` | `235 38% 20%` |

### Gradientes

| Classe CSS | Uso |
|---|---|
| `gradient-primary` | Violet → Blue (135deg) — Headers, banners |
| `gradient-accent` | Violet → Pink (135deg) — Destaques |
| `gradient-neon` | Violet → Blue (135deg) — Botões especiais |
| `gradient-dark` | Fundo escuro gradiente (180deg) |
| `gradient-card` | Card background gradiente (145deg) |
| `gradient-glow` | Glow sutil translúcido |

### Sombras

| Classe | Descrição |
|---|---|
| `shadow-soft` | Sombra suave |
| `shadow-medium` | Sombra média |
| `shadow-large` | Sombra grande |
| `shadow-glow` | Glow azul (primary) |
| `shadow-glow-accent` | Glow violeta (accent) |
| `shadow-neon-mixed` | Glow misto azul+violeta |

### Classes Utilitárias de Componente

| Classe | Descrição |
|---|---|
| `.glass-card` | Card com efeito frosted glass e borda glow |
| `.card-neon` | Card com borda azul glow |
| `.card-neon-cyan` | Card com borda violeta glow |
| `.card-neon-blue` | Card com borda azul glow |
| `.neon-border` | Borda com glow azul |
| `.neon-border-cyan` | Borda com glow violeta |
| `.neon-border-animated` | Borda com glow animado (pulsante) |
| `.btn-neon` | Botão com gradient neon + shadow |
| `.btn-neon-outline` | Botão outline com glow |
| `.input-neon` | Input com focus glow |
| `.text-gradient` | Texto com gradient neon |
| `.text-gradient-primary` | Texto com gradient primary |
| `.hover-lift` | Hover com translateY(-4px) + shadow |
| `.hover-glow` | Hover com shadow glow |
| `.glow-line` | Separador horizontal com gradient glow |
| `.neon-dot` | Ponto decorativo com glow |
| `.status-dot` | Indicador de status (online/warning/offline) |
| `.bg-animated-gradient` | Background animado (gradient-shift) |
| `.menu-strip-highlight` | Barra de destaque com gradient strip |

### Animações

| Classe/Keyframe | Descrição |
|---|---|
| `animate-fade-in` | Fade in (0.5s) |
| `animate-slide-up` | Slide para cima (0.5s) |
| `animate-slide-in-left` | Slide da esquerda (0.3s) |
| `animate-slide-in-right` | Slide da direita (0.3s) |
| `animate-slide-in-up` | Slide de baixo para cima (0.3s) |
| `animate-scale-in` | Scale in (0.2s) |
| `animate-glow-pulse` | Glow pulsante (3s infinite) |
| `animate-float` | Flutuação vertical (4s infinite) |
| `animate-marquee` | Marquee horizontal (15s infinite, para TV banners) |
| `neon-pulse` | Pulsação de brilho |
| `gradient-shift` | Animação de gradient (15s infinite) |
| `stagger-animation` | Animação escalonada para listas (50ms delay entre itens) |
| `glow-pulse` (tailwind) | Glow pulsante no sidebar (3s) |
| `portal-open` | Efeito de abertura tipo portal |
| `power-on` | Efeito de "ligar" com clip-path |
| `icon-glow` | Glow pulsante em ícones (2s) |
| `slide-neon` | Slide horizontal com fade |

### Scrollbar Customizada

- Track: deep blue (`232 45% 8%`)
- Thumb: gradient blue → violet
- 8px width

### Supressão de Toasts

O sistema **suprime globalmente** todos os toasts/balões via:
1. CSS: `display: none !important` em `[data-sonner-toaster]`, `[data-radix-toast-viewport]`, `[aria-live]`
2. JS: Override de todos os métodos do `sonner.toast` para no-ops no `App.tsx`

---

## 🔀 Roteamento (App.tsx)

### Tipos de Rotas

#### 1. Rotas PWA Isoladas (FORA do AuthProvider)
Rotas com autenticação própria baseada em PIN, sem compartilhar sessão:

| Rota | Componente | Descrição |
|---|---|---|
| `/:slug/totem` | `TenantTotemPWA` | Autoatendimento Totem |
| `/:slug/tablet` | `TenantTabletPWA` | Tablet autoatendimento |
| `/:slug/entregador` | `TenantEntregadorPWA` | Login entregador |
| `/:slug/garcom` | `TenantGarcomPWA` | Login garçom |
| `/:slug/garcom/app` | `TenantGarcomAppPWA` | App garçom |
| `/:slug/garcom/mesas` | `PWAWaiterTablesScreen` | Mesas (garçom) |
| `/:slug/garcom/comandas` | `PWAWaiterComandasScreen` | Comandas (garçom) |
| `/pwa/pizza-kds` | `PizzaKDSApp` | KDS Pizza PWA |
| `/pwa/pizza-kds-v2` | `PizzaKdsV2App` | KDS Pizza V2 |
| `/scheduled-orders` | `ScheduledOrdersPWA` | Pedidos agendados PWA |
| `/entregador/:companySlug` | `EntregadorLogin` | Login entregador por slug |
| `/ticket/:code` | `TicketRedeem` | Resgate de ticket via QR |

#### 2. Rotas Públicas (dentro do AuthProvider, mas acessíveis publicamente)

| Rota | Componente | Descrição |
|---|---|---|
| `/m/:token` | `PublicMenuByToken` | Cardápio por token |
| `/tv/:token` | `PublicTVByToken` | TV por token |
| `/r/:token` | `PublicRoletaByToken` | Roleta por token |
| `/kds/:token` | `PublicKDSByToken` | KDS por token |
| `/ss/:token` | `PublicSelfServiceByToken` | Self-service por token |
| `/balanca/:token` | `ScaleTerminal` | Balança por token |
| `/kiosk/:token` | `KioskPublic` | Kiosk por token |
| `/qr-mesa/:token` | `PublicQRMesa` | QR code mesa |
| `/qr-comanda/:token` | `PublicQRComanda` | QR code comanda |
| `/sommelier/:token` | `PublicSommelierPage` | Enólogo virtual |
| `/rotisseur/:token` | `PublicRotisseurPage` | Maître Rôtisseur |
| `/review/:token` | `PublicReviewByToken` | Avaliação por token |
| `/acompanhar/:orderId` | `PublicOrderTracker` | Rastreamento pedido |
| `/rastrear/:token` | `PublicDeliveryTracker` | Rastreamento entrega |
| `/fila/:token` | `QueueTrackerPage` | Fila de espera |
| `/reservas/:slug` | `PublicReservationBySlug` | Reservas por slug |
| `/:slug` | `PublicMenuBySlug` | Cardápio por slug |
| `/:slug/delivery` | `TenantDelivery` | Delivery por tenant |
| `/:slug/web` | `TenantWeb` | Menu web por tenant |
| `/:slug/tv` | `TenantTV` | TV por tenant |
| `/:slug/roleta` | `TenantRoleta` | Roleta por tenant |
| `/:slug/fidelidade` | `LoyaltyCustomerPortal` | Portal fidelidade |

#### 3. Rotas Internas Autenticadas (Principais)

| Rota | Página | Grupo |
|---|---|---|
| `/` | `RootEntry` → `Dashboard` | Principal |
| `/auth` | `Auth` | Autenticação |
| `/orders` | `Orders` | Pedidos |
| `/products` | `Products` | Cardápio |
| `/categories` | `Categories` | Cardápio |
| `/customers` | `Customers` | Clientes |
| `/kds` | `KDS` | Cozinha |
| `/tables` | `Tables` | Mesas |
| `/comandas` | `Comandas` | Comandas |
| `/cash-register` | `CashRegister` | Financeiro |
| `/pdv-loja` | `PDVLoja` | Terminal |
| `/terminal` | `OperatorTerminal` | Terminal |
| `/inventory` | `Inventory` | Estoque |
| `/reservations` | `Reservations` | Reservas |
| `/whatsapp` | `WhatsApp` | Comunicação |
| `/deliverers` | `Deliverers` | Entregas |
| `/reviews` | `Reviews` | Avaliações |
| `/loyalty` | `Loyalty` | Fidelidade |

#### 4. Rotas de Configuração (/settings/*)

| Rota | Descrição |
|---|---|
| `/settings/branding` | Branding e personalização |
| `/settings/integrations` | Integrações |
| `/settings/integration-hub` | Hub centralizado de integrações |
| `/settings/ai` | Configuração IA |
| `/settings/printing` | Impressão |
| `/settings/delivery` | Taxas de entrega |
| `/settings/kds` | KDS cozinha |
| `/settings/pizza` | Pizza |
| `/settings/sommelier` | Enólogo virtual |
| `/settings/scale` | Balança |
| `/settings/table` | Mesas |
| `/settings/reservations` | Reservas |
| `/settings/cash` | Caixa |
| `/settings/orders` | Pedidos |
| `/settings/sounds` | Sons |
| `/settings/panic` | Pânico |
| `/settings/wheel` | Roleta |
| `/settings/layout` | Layout cardápio |
| `/settings/tef` | TEF/Maquininhas |
| `/settings/tv-display` | TV Display |
| `/settings/kiosk` | Totem |
| `/settings/tablet-autoatendimento` | Tablet |
| `/settings/deliverer-tracking` | Rastreio GPS |
| `/settings/smartpos` | SmartPOS |
| `/settings/waiters` | Garçons |
| `/settings/footer` | Rodapé |
| `/settings/units` | Unidades de medida |
| `/settings/operator-permissions` | Permissões operador |
| `/settings/proactive-agent` | Agente proativo |

#### 5. Rotas ERP Financeiro (/finance-erp/*)

| Rota | Página |
|---|---|
| `/finance-erp` | ERPDashboardPage |
| `/finance-erp/sales-report` | ERPSalesReportPage |
| `/finance-erp/top-products` | ERPTopProductsPage |
| `/finance-erp/discounts` | ERPDiscountsPage |
| `/finance-erp/delivery-fees` | ERPDeliveryFeesPage |
| `/finance-erp/receivables` | ERPReceivablesPage |
| `/finance-erp/payables` | ERPPayablesPage |
| `/finance-erp/cost-centers` | ERPCostCentersPage |
| `/finance-erp/product-costs` | ERPProductCostsPage |
| `/finance-erp/dre` | ERPDREPage |
| `/finance-erp/dre-advanced` | ERPDREAdvancedPage |
| `/finance-erp/cmv` | ERPCMVPage |
| `/finance-erp/cash-flow` | ERPCashFlowPage |
| `/finance-erp/executive` | ERPExecutivePage |
| `/finance-erp/budgets` | ERPBudgetsPage |
| `/finance-erp/alerts` | ERPAlertsPage |

#### 6. Rotas ERP Estoque (/erp/*)

| Rota | Página |
|---|---|
| `/erp` | ERPStockDashboardPage |
| `/erp/items` | ERPItemsPage |
| `/erp/suppliers` | ERPSuppliersPage |
| `/erp/purchases` | ERPPurchasesPage |
| `/erp/recipes` | ERPRecipesPage |
| `/erp/stock` | ERPStockPage |
| `/erp/movements` | ERPMovementsPage |
| `/erp/inventory-count` | ERPInventoryCountPage |
| `/erp/cmv` | ERPCMVAnalysisPage |
| `/erp/pricing` | ERPPricingPage |
| `/erp/profit` | ERPProfitPage |

#### 7. Rotas CRM (/crm/*)

| Rota | Página |
|---|---|
| `/crm` | CRMDashboardPage |
| `/crm/leads` | CRMLeadsPage |
| `/crm/customers` | CRMCustomersPage |
| `/crm/activities` | CRMActivitiesPage |
| `/crm/automations` | CRMAutomationsPage |
| `/crm/pipeline` | CRMPipelinePage |

#### 8. Rotas SaaS Admin (/saas/*)

| Rota | Página | Acesso |
|---|---|---|
| `/saas` | SaasDashboard | super_admin |
| `/saas/companies` | SaasCompanies | super_admin |
| `/saas/companies/:id` | SaasCompanyDetails | super_admin |
| `/saas/plans` | SaasPlans | super_admin |
| `/saas/subscriptions` | SaasSubscriptions | super_admin |
| `/saas/templates` | SaasTemplates | super_admin |
| `/saas/audit` | SaasAudit | super_admin |
| `/saas/users` | SaasUsers | super_admin |
| `/saas/licenses` | SaasLicenses | super_admin |
| `/saas/resellers` | ResellerManagement | super_admin |

#### 9. Rotas Revendedor

| Rota | Página | Acesso |
|---|---|---|
| `/reseller/dashboard` | ResellerDashboard | revendedor |
| `/reseller/branding` | ResellerBranding | revendedor |

---

## 📦 Módulos Isolados (`src/modules/`)

Cada módulo segue o padrão: `types/ → hooks/ → services/ → components/ → pages/ → index.ts`

| Módulo | Caminho | Descrição |
|---|---|---|
| `finance-erp` | `/modules/finance-erp/` | ERP Financeiro completo (DRE, CMV, Fluxo Caixa) |
| `erp-inventory` | `/modules/erp-inventory/` | ERP Estoque (itens, fornecedores, fichas técnicas, precificação) |
| `crm` | `/modules/crm/` | CRM (leads, pipeline, automações, atividades) |
| `fiscal` | `/modules/fiscal/` | Fiscal (NF-e, NCM, CFOP, CEST, IBS/CBS) |
| `employees` | `/modules/employees/` | Gestão de funcionários, escalas, comissões |
| `marketing` | `/modules/marketing/` | Hub de marketing, campanhas, automações |
| `integrations` | `/modules/integrations/` | Hub de integrações, WhatsApp, pagamentos |
| `marketplace` | `/modules/marketplace/` | Integrações marketplace (iFood, etc.) |
| `sommelier` | `/modules/sommelier/` | Enólogo/Sommelier virtual |
| `rotisseur` | `/modules/rotisseur/` | Maître Rôtisseur |
| `saas-subscriptions` | `/modules/saas-subscriptions/` | Assinaturas SaaS, botões de suporte, links da empresa |
| `multi-store` | `/modules/multi-store/` | Multi-lojas |
| `backup` | `/modules/backup/` | Backup e restauração |
| `batch-operations` | `/modules/batch-operations/` | Alterações em lote |
| `reports` | `/modules/reports/` | Hub de relatórios |
| `sales-projection` | `/modules/sales-projection/` | Projeção de vendas |
| `smart-purchasing` | `/modules/smart-purchasing/` | Compras inteligentes |
| `routing` | `/modules/routing/` | Rotas de entrega |
| `help-center` | `/modules/help-center/` | Central de ajuda + gamificação |
| `products` | `/modules/products/` | Gestão avançada de produtos |
| `assets` | `/modules/assets/` | Ativos e manutenções |

---

## 🔐 Sistema de Roles e Permissões

### Roles

| Role | Descrição | Sidebar |
|---|---|---|
| `super_admin` | Administrador global da plataforma | Gestão Revendedores + Admin SaaS |
| `admin` / `company_admin` | Administrador da empresa | Todos os menus + drag-and-drop |
| `revendedor` | Revendedor (white-label) | Painel + Branding (sem menus de super_admin) |
| Outros roles | Operadores com permissões limitadas | Menus padrão |

### Guards e Hooks

| Hook/Guard | Função |
|---|---|
| `useAuth()` | Sessão do usuário (login, logout, user) |
| `useUserRoles()` | Verifica roles (isSuperAdmin, isRevendedor) |
| `useUserRole()` | Role da empresa atual |
| `useCompanyModules()` | Módulos ativos da empresa |
| `useCompanyBlocking()` | Verifica se empresa está bloqueada |
| `CompanyAccessGuard` | Bloqueia acesso se sem permissão na empresa |

---

## ⚡ Performance e Otimizações

| Otimização | Detalhes |
|---|---|
| **Lazy Loading** | 95% das páginas usam `React.lazy()` + `Suspense` |
| **Polling otimizado** | Dashboard 60s, SmartPOS 30s, AutoPrint 45s |
| **refetchOnWindowFocus: false** | Desativado globalmente (reduz ~70% tráfego) |
| **Prefetch no Dashboard** | Orders, products, deliverers pré-carregados |
| **staleTime** | 30s para pedidos, 5min para produtos/entregadores |
| **Scroll persistente** | Sidebar mantém posição via sessionStorage |
| **Skeleton loading** | Cards com animate-pulse durante loading |

---

## 🌐 PWA Support

O sistema suporta múltiplas PWAs independentes via `vite-plugin-pwa`:

| PWA | Manifest | Escopo |
|---|---|---|
| Pizza KDS | `pizza-kds.webmanifest` | `/pwa/pizza-kds` |
| Pizza KDS V2 | (similar) | `/pwa/pizza-kds-v2` |
| Totem | Dinâmico via `PWAManifestInitializer` | `/:slug/totem` |
| Tablet | Dinâmico | `/:slug/tablet` |
| Garçom | Dinâmico | `/:slug/garcom` |
| Entregador | Dinâmico | `/:slug/entregador` |
| PDV | Dinâmico | `/:slug/pdv` |
| Terminal | Dinâmico | `/:slug/terminal` |

---

## 📝 Convenções de Código

1. **Linguagem UI:** Tudo em Português (PT-BR)
2. **Sem toasts:** Supressão global de todos os toasts/balões
3. **Design tokens:** Usar variáveis CSS semânticas, nunca cores diretas
4. **Hooks por domínio:** Um hook por funcionalidade (useOrders, useProducts, etc.)
5. **Módulos isolados:** Cada módulo exporta via barrel file (index.ts)
6. **Components shadcn/ui:** Base para todos os componentes UI
7. **Framer Motion:** Animações de sidebar e transições
8. **Recharts:** Gráficos no dashboard
9. **TanStack Query:** Gerenciamento de estado servidor
10. **Supabase RLS:** Todas as tabelas com Row Level Security

---

*Documentação gerada automaticamente com base no código-fonte atual do projeto.*
