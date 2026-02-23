# ZOOPI - Documentação Completa do Sistema

> **Versão:** 2.0 | **Última atualização:** 26/12/2024

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Módulos Ativos](#módulos-ativos)
4. [Sistema de IA](#sistema-de-ia)
5. [KDS - Kitchen Display System](#kds---kitchen-display-system)
6. [Sistema de Impressão](#sistema-de-impressão)
7. [TV de Promoções](#tv-de-promoções)
8. [App de Pedido Online (Delivery)](#app-de-pedido-online-delivery)
9. [Estrutura de Dados](#estrutura-de-dados)
10. [Edge Functions](#edge-functions)
11. [Fluxos Principais](#fluxos-principais)

---

## Visão Geral

**Zoopi** é uma plataforma SaaS multi-tenant para gestão de restaurantes, focada em:

- **App de Pedido Online** (Delivery/Cardápio Digital)
- **KDS** (Kitchen Display System)
- **Sistema de Impressão por Setores**
- **Inteligência Artificial** para gestão do negócio
- **TV de Promoções** para exibição de cardápio

### Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS + shadcn/ui |
| Estado | TanStack Query (React Query) |
| Backend | Supabase (Lovable Cloud) |
| IA | Self-Hosted AI Providers (via UI) |
| Autenticação | Supabase Auth |
| Storage | Supabase Storage |

### Módulos Cancelados (Não Desenvolver)

- ❌ Tablet de Mesa (Garçom Virtual)
- ❌ Totem de Autoatendimento
- ❌ QR Code de Mesa

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA PÚBLICA                              │
├─────────────────────────────────────────────────────────────────┤
│  /m/:token    → Cardápio Online (Delivery)                      │
│  /tv/:token   → Tela de Promoções (TV)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA OPERACIONAL                          │
├─────────────────────────────────────────────────────────────────┤
│  /kds           → Kitchen Display System                        │
│  /orders        → Gestão de Pedidos                             │
│  /products      → Gestão de Produtos                            │
│  /banners       → Gestão de Banners (TV)                        │
│  /tv-screens    → Gestão de Telas de TV                         │
│  /settings      → Configurações (Impressão, IA, Branding)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA DE IA                                │
├─────────────────────────────────────────────────────────────────┤
│  /ai-recommendations  → Recomendações Explicáveis               │
│  /ai-suggestions      → Sugestões de Cardápio                   │
│  AI Assistant Chat    → Assistente Multimodal                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA SaaS                                 │
├─────────────────────────────────────────────────────────────────┤
│  /saas/dashboard      → Dashboard Admin                         │
│  /saas/companies      → Gestão de Empresas                      │
│  /saas/subscriptions  → Assinaturas                             │
│  /saas/plans          → Planos                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Módulos Ativos

### Status de Maturidade

| Módulo | Status | Descrição |
|--------|--------|-----------|
| App de Pedido Online | 🟩 Funcional | Cardápio digital com carrinho e checkout |
| KDS | 🟩 Funcional | Exibição de pedidos por status/setor |
| Impressão por Setores | 🟩 Funcional | Impressão automática separada por setor |
| IA Manager | 🟩 Funcional | Análise de negócio com recomendações |
| IA Assistant | 🟩 Funcional | Chat multimodal (texto, imagem, PDF) |
| TV de Promoções | 🟩 Funcional | Exibição de cardápio e banners |
| Campanhas WhatsApp | 🟩 Funcional | Campanhas inteligentes com segmentação |
| Gestão de Produtos | 🟩 Funcional | CRUD completo com categorização |
| Gestão de Pedidos | 🟩 Funcional | Kanban com fluxo de status |

---

## Sistema de IA

### Visão Geral da IA

O Zoopi utiliza **provedores de IA self-hosted** configurados por empresa via UI. Provedores suportados:

| Provedor | Uso |
|----------|-----|
| OpenAI (GPT) | Chat, análises, recomendações |
| Google Gemini | Análises, imagens, contextos complexos |
| Groq | Respostas rápidas |
| Grok (xAI) | Análises alternativas |
| Meta LLaMA | Modelos open-source |
| Anthropic | Claude para análises avançadas |

### 1. AI Manager (Recomendações Explicáveis)

**Edge Function:** `supabase/functions/ai-manager/index.ts`

**Funcionalidades:**
- Análise completa do negócio (vendas, produtos, tendências)
- Recomendações baseadas em perfil da loja (conservador/equilibrado/agressivo)
- Explicação do "porquê" de cada sugestão
- Avaliação de risco e impacto esperado
- Respeito a regras globais (máx. 1 remoção/semana, etc.)

**Tipos de Recomendação:**
| Tipo | Descrição |
|------|-----------|
| `menu` | Alterações no cardápio |
| `price` | Ajustes de preço |
| `combo` | Sugestões de combos |
| `promo` | Promoções |
| `remove` | Remoção de produtos |
| `tv` | Destaques na TV |

**Perfis de Loja:**

```typescript
type StoreProfile = 'conservative' | 'balanced' | 'aggressive';
```

| Perfil | Comportamento |
|--------|---------------|
| Conservador | Nunca remove produtos, foco em melhorias incrementais |
| Equilibrado | Remove após 45+ dias sem venda, promoções moderadas |
| Agressivo | Remove após 30 dias, promoções frequentes |

**Regras Globais (Invioláveis):**
1. Máximo 1 remoção de produto por semana
2. Máximo 3 alterações de preço por semana
3. Nunca mexer em produtos < 14 dias
4. Não sugerir promoções se operação sobrecarregada

**Formato de Resposta:**

```json
{
  "recommendations": [
    {
      "type": "menu | price | combo | promo | remove | tv",
      "title": "Título da recomendação",
      "explanation": {
        "why": "Motivo baseado em dados + perfil",
        "risk_if_ignored": "O que pode acontecer",
        "expected_impact": {
          "sales": "increase | neutral | decrease",
          "operation": "simplify | neutral | complex",
          "confidence": "low | medium | high"
        }
      },
      "suggested_action": {
        "action": "Ação específica",
        "details": {}
      },
      "priority": 1
    }
  ]
}
```

**Hook:** `src/hooks/useAIRecommendations.ts`

```typescript
const { analyzeBusiness } = useAnalyzeBusiness();
const { recommendations } = useAIRecommendations();
const { updateStatus } = useUpdateRecommendationStatus();
```

### 2. AI Assistant (Chat Multimodal)

**Edge Function:** `supabase/functions/ai-assistant/index.ts`

**Funcionalidades:**
- Chat com contexto do negócio
- Análise de imagens (fotos de pratos, cardápios)
- Análise de PDFs (cardápios de concorrentes)
- Histórico de conversas por sessão

**Tipos de Input:**

| Input | Modelo Usado | Descrição |
|-------|--------------|-----------|
| Texto | gemini-2.5-flash | Perguntas e consultas |
| Imagem | gemini-2.5-pro | Análise visual de pratos |
| PDF | gemini-2.5-flash | Extração e análise de documentos |

**Contexto Automático:**
- Nome da empresa
- Perfil da loja
- Produtos ativos
- Top 5 produtos vendidos
- Ticket médio
- Faturamento 30 dias

**Formato de Resposta:**

```json
{
  "text_response": "Resposta principal",
  "analysis": {
    "what_was_analyzed": "O que foi analisado",
    "key_findings": ["Achado 1", "Achado 2"],
    "suggested_actions": ["Ação 1", "Ação 2"]
  }
}
```

**Componente:** `src/components/ai-assistant/AIAssistantChat.tsx`

### 3. AI Campanhas

**Edge Function:** `supabase/functions/ai-campaigns/index.ts`

**Funcionalidades:**
- Geração de campanhas baseadas em dados
- Segmentação automática de clientes
- Templates de mensagem personalizados
- Sugestões de horário de envio

### 4. AI Recompra

**Edge Function:** `supabase/functions/ai-repurchase/index.ts`

**Funcionalidades:**
- Identificação de clientes inativos
- Previsão de produtos para recompra
- Mensagens personalizadas

### Tabelas de IA

| Tabela | Descrição |
|--------|-----------|
| `ai_recommendations` | Recomendações geradas |
| `ai_recommendation_impacts` | Impacto medido após aplicação |
| `ai_insight_runs` | Histórico de análises |
| `ai_chat_messages` | Histórico do chat |
| `ai_jobs` | Controle de jobs de IA |
| `ai_confidence_scores` | Scores de confiança por módulo |

---

## KDS - Kitchen Display System

### Visão Geral

O KDS é a tela de cozinha para visualizar e gerenciar pedidos em tempo real.

**Rota:** `/kds`

**Componentes:**
- `src/pages/KDS.tsx` - Página principal
- `src/components/kds/KDSLayout.tsx` - Layout do KDS
- `src/components/kds/KDSOrderCard.tsx` - Card de pedido

**Hook:** `src/hooks/useKDS.ts`

### Funcionalidades

1. **Visualização por Status**
   - Novo (azul)
   - Em Preparo (amarelo)
   - Pronto (verde)

2. **Filtros**
   - Por setor de impressão
   - Por status do pedido

3. **Tempo Real**
   - Atualização automática (polling 30s)
   - Subscription Realtime do Supabase

4. **Indicadores**
   - Idade do pedido (minutos)
   - Pedidos atrasados (vermelho pulsante)
   - SLA por setor

5. **Ações**
   - Avançar status do pedido
   - Fullscreen mode

### Estrutura do KDSOrder

```typescript
interface KDSOrder {
  id: string;
  company_id: string;
  customer_name: string | null;
  status: OrderStatus; // 'novo' | 'preparo' | 'pronto' | 'entregue' | 'cancelado'
  order_type: string;
  total: number;
  notes: string | null;
  created_at: string;
  items: KDSOrderItem[];
  age_minutes: number;
  is_overdue: boolean;
}

interface KDSOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
  sector_id?: string;
  sector_name?: string;
  sector_color?: string;
}
```

### Fluxo de Status

```
NOVO → EM PREPARO → PRONTO → ENTREGUE
         ↓
      CANCELADO
```

---

## Sistema de Impressão

### Visão Geral

Sistema de impressão automática por setores (cozinha, bar, copa, etc.).

**Arquivos:**
- `src/lib/print/PrintService.ts` - Serviço principal
- `src/lib/print/sectorPrint.ts` - Impressão por setor
- `src/lib/print/types.ts` - Tipos
- `src/components/orders/SectorPrintMenu.tsx` - Menu de impressão

**Hook:** `src/hooks/usePrintSectors.ts`

### Funcionalidades

1. **Setores de Impressão**
   - Cadastro de setores (nome, cor, SLA)
   - Associação produto → setor
   - Múltiplos setores por produto

2. **Impressão Automática**
   - Impressão separada por setor
   - Destaque visual do setor no comprovante
   - Observações do item incluídas

3. **Impressão Manual**
   - Menu dropdown por pedido
   - Imprimir todos os setores
   - Imprimir setor específico
   - Imprimir pedido completo

### Estrutura do Setor

```typescript
interface PrintSector {
  id: string;
  company_id: string;
  name: string;
  color: string;
  active: boolean;
  display_order: number;
  sla_minutes: number;
}

interface ProductPrintSector {
  id: string;
  product_id: string;
  sector_id: string;
}
```

### Template de Impressão

```html
<!-- Cabeçalho -->
<div class="header">
  <h2>Nome da Empresa</h2>
  <div class="sector-badge" style="background: #cor-do-setor">
    NOME DO SETOR
  </div>
  <p>Pedido #ABC123</p>
  <p>26/12/2024 - 14:30</p>
</div>

<!-- Cliente -->
<div class="info">Cliente: João Silva</div>
<div class="info">OBS: Sem cebola</div>

<!-- Itens -->
<table>
  <tr>
    <td><strong>2x</strong> X-Burger</td>
  </tr>
  <tr>
    <td><strong>1x</strong> Batata Frita</td>
  </tr>
</table>

<!-- Rodapé -->
<div class="footer">
  --- COZINHA ---
</div>
```

---

## TV de Promoções

### Visão Geral

Exibição de cardápio e banners promocionais em TVs do estabelecimento.

**Rota Pública:** `/tv/:token`

**Arquivos:**
- `src/pages/PublicTVByToken.tsx` - Página pública
- `src/pages/TVScreens.tsx` - Gestão de telas
- `src/pages/Banners.tsx` - Gestão de banners

**Hooks:**
- `src/hooks/useTVScreens.ts`
- `src/hooks/useTVMenu.ts`
- `src/hooks/useBanners.ts`

### Funcionalidades

1. **Gestão de Telas**
   - Criar múltiplas telas
   - Token único por tela
   - Ativar/desativar telas

2. **Banners Promocionais**
   - Upload de imagens
   - Ordenação por drag-and-drop
   - Vinculação a tela específica
   - Rotação automática

3. **Exibição de Produtos**
   - Filtro `aparece_tv = true`
   - Organização por categoria
   - Preços formatados
   - Destaque visual

### Estrutura da TV Screen

```typescript
interface TVScreen {
  id: string;
  company_id: string;
  name: string;
  token: string;
  active: boolean;
}

interface Banner {
  id: string;
  company_id: string;
  title: string | null;
  image_url: string;
  active: boolean;
  display_order: number;
  tv_screen_id: string | null;
}
```

### Fluxo de Acesso

1. Admin cria tela em `/tv-screens`
2. Sistema gera token único (`tv_abc123...`)
3. Admin copia URL `/tv/tv_abc123...`
4. TV acessa URL → exibe cardápio + banners
5. Atualização automática

---

## App de Pedido Online (Delivery)

### Visão Geral

Cardápio digital com carrinho e checkout para pedidos delivery.

**Rota Pública:** `/m/:token`

**Arquivos:**
- `src/pages/PublicMenuByToken.tsx` - Página pública
- `src/pages/DeliveryMenu.tsx` - Gestão do menu
- `src/components/menu/ProductCard.tsx` - Card de produto
- `src/components/menu/CartSheet.tsx` - Carrinho
- `src/contexts/CartContext.tsx` - Contexto do carrinho

**Hooks:**
- `src/hooks/useMenuByToken.ts`
- `src/hooks/useDeliveryMenu.ts`

### Funcionalidades

1. **Cardápio Digital**
   - Navegação por categorias
   - Busca de produtos
   - Filtro `aparece_delivery = true`
   - Imagens e preços

2. **Carrinho de Compras**
   - Adicionar/remover itens
   - Quantidade
   - Observações por item
   - Cálculo de total

3. **Checkout**
   - Dados do cliente (nome, telefone)
   - Endereço de entrega
   - Método de pagamento
   - Observações do pedido

4. **Pedido**
   - Criação automática na tabela `orders`
   - Status inicial: `novo`
   - Notificação para operação

### Filtros de Visibilidade

```typescript
interface Product {
  aparece_delivery: boolean;  // Visível no delivery
  aparece_tv: boolean;        // Visível na TV
  aparece_qrcode: boolean;    // (cancelado)
  aparece_totem: boolean;     // (cancelado)
  aparece_tablet: boolean;    // (cancelado)
}
```

---

## Estrutura de Dados

### Tabelas Principais

#### companies
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
slug TEXT UNIQUE
logo_url TEXT
primary_color TEXT
store_profile ENUM('conservative', 'balanced', 'aggressive')
is_active BOOLEAN
menu_token TEXT UNIQUE
```

#### products
```sql
id UUID PRIMARY KEY
company_id UUID REFERENCES companies
name TEXT NOT NULL
price NUMERIC
active BOOLEAN
subcategory_id UUID REFERENCES subcategories
aparece_delivery BOOLEAN
aparece_tv BOOLEAN
```

#### orders
```sql
id UUID PRIMARY KEY
company_id UUID REFERENCES companies
customer_name TEXT
customer_phone TEXT
customer_address TEXT
status order_status ENUM
order_type TEXT
total NUMERIC
notes TEXT
```

#### order_items
```sql
id UUID PRIMARY KEY
order_id UUID REFERENCES orders
product_id UUID REFERENCES products
product_name TEXT
quantity INTEGER
unit_price NUMERIC
notes TEXT
```

#### print_sectors
```sql
id UUID PRIMARY KEY
company_id UUID REFERENCES companies
name TEXT
color TEXT
sla_minutes INTEGER
active BOOLEAN
```

#### product_print_sectors
```sql
id UUID PRIMARY KEY
product_id UUID REFERENCES products
sector_id UUID REFERENCES print_sectors
```

#### tv_screens
```sql
id UUID PRIMARY KEY
company_id UUID REFERENCES companies
name TEXT
token TEXT UNIQUE
active BOOLEAN
```

#### banners
```sql
id UUID PRIMARY KEY
company_id UUID REFERENCES companies
title TEXT
image_url TEXT
active BOOLEAN
display_order INTEGER
tv_screen_id UUID REFERENCES tv_screens
```

### Status de Pedido

```typescript
type OrderStatus = 
  | 'novo'      // Aguardando
  | 'preparo'   // Em preparo
  | 'pronto'    // Pronto para entrega
  | 'entregue'  // Entregue
  | 'cancelado' // Cancelado
```

---

## Edge Functions

### Funções Disponíveis

| Função | Descrição | Tabela Relacionada |
|--------|-----------|-------------------|
| `ai-manager` | Análise de negócio e recomendações | `ai_recommendations` |
| `ai-assistant` | Chat multimodal | `ai_chat_messages` |
| `ai-campaigns` | Geração de campanhas | `campaigns` |
| `ai-repurchase` | Sugestões de recompra | `repurchase_suggestions` |
| `ai-chat` | Chat simples | `ai_chat_messages` |
| `ai-tts` | Text-to-Speech | - |
| `ai-tv-highlight` | Destaques para TV | - |
| `ai-tv-scheduler` | Agendamento de TV | - |
| `ai-menu-creative` | Criação de cardápio | `menu_creative_suggestions` |
| `ai-menu-highlight` | Destaques do menu | - |
| `send-whatsapp` | Envio de WhatsApp | `campaign_messages` |
| `webhook-asaas` | Webhook Asaas | `invoices` |
| `webhook-mercadopago` | Webhook MercadoPago | `invoices` |
| `clone-company-menu` | Clone de cardápio | - |

### Padrão de Edge Function

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Buscar configuração de IA da empresa
    const aiConfig = await getAIConfig(supabase, companyId);
    
    // Inicializar Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar acesso da empresa
    const { data: access } = await supabase
      .rpc('check_company_access', { company_uuid: companyId });

    if (!access?.allowed) {
      return new Response(
        JSON.stringify({ error: 'Acesso bloqueado' }),
        { status: 403 }
      );
    }

    // Lógica principal...

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

---

## Fluxos Principais

### 1. Fluxo de Pedido (Delivery)

```
Cliente acessa /m/:token
         │
         ▼
Navega cardápio → Adiciona ao carrinho
         │
         ▼
Preenche dados → Confirma pedido
         │
         ▼
Pedido criado (status: 'novo')
         │
         ▼
KDS recebe (realtime) → Operador visualiza
         │
         ▼
Muda para 'preparo' → Impressão automática por setor
         │
         ▼
Muda para 'pronto' → Aguarda entrega
         │
         ▼
Muda para 'entregue' → Pedido concluído
```

### 2. Fluxo de Análise IA

```
Usuário clica "Analisar Negócio"
         │
         ▼
Edge function ai-manager inicia
         │
         ▼
Busca dados: pedidos 30/60/90 dias, produtos, vendas
         │
         ▼
Aplica regras do perfil da loja
         │
         ▼
Chama Self-Hosted AI Provider
         │
         ▼
Gera até 5 recomendações explicáveis
         │
         ▼
Salva em ai_recommendations
         │
         ▼
Usuário visualiza e pode Aplicar/Ignorar
         │
         ▼
Sistema mede impacto (ai_recommendation_impacts)
```

### 3. Fluxo de Impressão

```
Pedido muda para 'preparo'
         │
         ▼
Sistema agrupa itens por setor
         │
         ▼
Para cada setor:
  │
  ├── Gera HTML do comprovante
  ├── Abre janela de impressão
  └── Destaca setor no cabeçalho
         │
         ▼
Impressão enviada para impressora do setor
```

---

## Secrets Configurados

| Secret | Descrição |
|--------|-----------|
| `AI Provider Keys` | Configurado via UI por empresa (ai_provider_config) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave pública Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço Supabase |

---

## Storage Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| `banners` | ✅ Sim | Imagens de banners promocionais |
| `logos` | ✅ Sim | Logos das empresas |

---

## RLS Policies

### orders
- SELECT: Apenas da própria empresa
- INSERT: Apenas para própria empresa
- UPDATE: Apenas da própria empresa
- DELETE: Apenas da própria empresa

### order_items
- SELECT: Via join com orders da empresa
- INSERT: Se order pertence à empresa
- UPDATE: Se order pertence à empresa
- DELETE: Se order pertence à empresa

### products
- SELECT: Apenas da própria empresa (ou público para cardápio)
- INSERT/UPDATE/DELETE: Apenas da própria empresa

---

## Métricas e Limites

### Limites por Plano (exemplos)

| Recurso | Trial | Básico | Pro |
|---------|-------|--------|-----|
| Produtos | 50 | 200 | Ilimitado |
| Telas TV | 1 | 3 | 10 |
| Usuários | 2 | 5 | 20 |
| Análises IA/mês | 50 | 200 | 1000 |
| Campanhas/mês | 20 | 100 | 500 |

### Funções de Validação

```sql
-- Verificar acesso da empresa
check_company_access(company_uuid) → { allowed, reason, grace_until, plan_limits }

-- Verificar uso atual
get_company_usage(company_uuid) → { products_count, tv_screens_count, users_count, ... }
```

---

## Resumo Executivo

| Área | Status | Observações |
|------|--------|-------------|
| **Delivery Online** | ✅ Completo | Cardápio + Carrinho + Checkout |
| **KDS** | ✅ Completo | Realtime + Filtros + Status |
| **Impressão** | ✅ Completo | Por setor + Automática |
| **IA Manager** | ✅ Completo | Recomendações explicáveis |
| **IA Assistant** | ✅ Completo | Multimodal (texto/imagem/PDF) |
| **TV Promoções** | ✅ Completo | Múltiplas telas + Banners |
| **Campanhas** | ✅ Completo | WhatsApp + Segmentação |
| **SaaS Admin** | ✅ Completo | Multi-tenant |

---

**Documentação gerada em:** 26/12/2024
