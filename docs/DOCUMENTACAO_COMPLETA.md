# DOCUMENTAÇÃO TÉCNICA COMPLETA - SISTEMA ZOOPI

**Data:** 25/12/2025  
**Versão:** 2.0  
**Status:** AUDITORIA HONESTA E IMPARCIAL

---

## ÍNDICE

1. [Resumo Executivo](#1-resumo-executivo)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Tabela Geral de Status](#3-tabela-geral-de-status)
4. [Banco de Dados](#4-banco-de-dados)
5. [Autenticação e Autorização](#5-autenticação-e-autorização)
6. [Módulo SaaS (Admin do Sistema)](#6-módulo-saas-admin-do-sistema)
7. [Cobrança e Assinaturas](#7-cobrança-e-assinaturas)
8. [Cardápio Digital](#8-cardápio-digital)
9. [Links Públicos e Tokens](#9-links-públicos-e-tokens)
10. [Sistema de Pedidos](#10-sistema-de-pedidos)
11. [Sistema de TV](#11-sistema-de-tv)
12. [Inteligência Artificial](#12-inteligência-artificial)
13. [Marketing e Campanhas](#13-marketing-e-campanhas)
14. [Gamificação (Roleta)](#14-gamificação-roleta)
15. [Edge Functions](#15-edge-functions)
16. [Rotas da Aplicação](#16-rotas-da-aplicação)
17. [Falhas Críticas](#17-falhas-críticas)
18. [Funcionalidades Ausentes](#18-funcionalidades-ausentes)
19. [Riscos para Produção](#19-riscos-para-produção)
20. [Prioridades Técnicas](#20-prioridades-técnicas)

---

## 1. RESUMO EXECUTIVO

### 🔴 SITUAÇÃO GERAL: PROTÓTIPO FUNCIONAL

O sistema Zoopi é um **protótipo funcional** com estrutura de banco de dados bem definida, mas com **funcionalidades críticas não implementadas ou parcialmente funcionais**.

**O sistema NÃO está pronto para produção comercial SaaS.**

### Números Reais do Banco de Dados

| Dado | Quantidade |
|------|------------|
| Empresas | 1 |
| Produtos | 0 |
| Pedidos | 0 |
| Clientes | 0 |
| Campanhas | 0 |
| Recomendações IA | 0 |
| Assinaturas | 0 |
| Planos | 3 |

### Problemas Críticos

1. **ZERO dados reais** - Sistema nunca foi usado em produção
2. **Cobrança NÃO funciona** - Webhooks existem mas não há fluxo completo
3. **Bloqueio automático NÃO existe** - Empresas inativas ainda acessam
4. **IA Self-Hosted** - Usa provedores configurados por empresa via UI (OpenAI, Gemini, Groq, etc.)
5. **Nenhum trigger ativo** no banco de dados

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS + Shadcn/UI |
| Estado | TanStack Query + React Context |
| Navegação | React Router DOM v6 |
| Backend | Supabase (Lovable Cloud) |
| Banco | PostgreSQL com RLS |
| Functions | Deno (Edge Functions) |
| Storage | Supabase Storage |
| AI | Self-Hosted (OpenAI, Gemini, Groq, Grok, LLaMA) |

### 2.2 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Dashboard   │  │ Cardápio    │  │ IA (Gestora +       │  │
│  │ Pedidos     │  │ Produtos    │  │     Assistente)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   LOVABLE CLOUD (Supabase)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Edge Functions  │  │ PostgreSQL + RLS│  │ Storage      │ │
│  │ - ai-manager    │  │ - 39 tabelas    │  │ - banners    │ │
│  │ - ai-assistant  │  │ - company_id    │  │              │ │
│  │ - webhooks      │  │ - RLS ativo     │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Modelo Multi-Tenant

- **Arquitetura:** Banco compartilhado com isolamento por `company_id`
- **Isolamento:** Row Level Security (RLS) em TODAS as tabelas
- **Funções de contexto:** `get_user_company_id()`, `has_role()`, `is_saas_admin()`

---

## 3. TABELA GERAL DE STATUS

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Autenticação** | ✅ Implementado | Login/Registro via Supabase Auth |
| **Empresas** | ⚠️ Parcial | Criação funciona, sem bloqueio por inatividade |
| **Cardápio Digital** | ✅ Implementado | CRUD completo (sem dados) |
| **Links Públicos** | ✅ Implementado | Tokens v2 com prefixo |
| **Carrinho/Checkout** | ⚠️ Parcial | UI existe, sem pagamento online |
| **Kanban Pedidos** | ✅ Implementado | Realtime funciona |
| **TV Display** | ✅ Implementado | Rotação de banners/produtos |
| **Roleta Prêmios** | ⚠️ Parcial | UI existe, lógica incompleta |
| **Painel SaaS** | ✅ Implementado | Dashboard, planos, empresas |
| **Cobrança/Assinaturas** | ❌ Não Funcional | Sem fluxo de pagamento |
| **Bloqueio Automático** | ❌ Não Implementado | Função existe mas não é chamada |
| **IA Assistente** | ✅ Implementado | Self-Hosted com Main + Fallback |
| **IA Gestora** | ⚠️ Parcial | Código existe, nunca executado |
| **Marketing/Pixel** | ✅ Implementado | GA4, Meta Pixel, GTM |
| **WhatsApp** | ⚠️ Parcial | Apenas link wa.me |

---

## 4. BANCO DE DADOS

### 4.1 Tabelas Principais (39 total)

#### Core

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `companies` | Empresas cadastradas | ✅ |
| `profiles` | Perfis de usuários | ✅ |
| `user_roles` | Papéis (admin/employee) | ✅ |

#### Cardápio

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `categories` | Categorias de produtos | ✅ |
| `subcategories` | Subcategorias | ✅ |
| `products` | Produtos do cardápio | ✅ |
| `banners` | Banners para TV | ✅ |

#### Pedidos

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `orders` | Pedidos | ✅ |
| `order_items` | Itens do pedido | ✅ |
| `customers` | Clientes | ✅ |
| `deliverers` | Entregadores | ✅ |
| `cash_closings` | Fechamentos de caixa | ✅ |

#### Marketing/AI

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `campaigns` | Campanhas de marketing | ✅ |
| `campaign_messages` | Mensagens enviadas | ✅ |
| `ai_recommendations` | Recomendações IA | ✅ |
| `ai_chat_messages` | Chat com assistente | ✅ |
| `ai_jobs` | Jobs de IA | ✅ |
| `repurchase_suggestions` | Sugestões de recompra | ✅ |

#### TV/Display

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `tv_screens` | Telas de TV | ✅ |
| `tv_schedules` | Programação | ✅ |
| `tv_schedule_suggestions` | Sugestões IA | ✅ |

#### Gamificação

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `prizes` | Prêmios da roleta | ✅ |
| `prize_wins` | Ganhadores | ✅ |

#### SaaS Admin

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `saas_admins` | Administradores SaaS | ✅ |
| `saas_audit_logs` | Logs de auditoria | ✅ |
| `plans` | Planos de assinatura | ✅ |
| `subscriptions` | Assinaturas | ✅ |

#### Tokens/Links

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `company_public_links` | Tokens públicos | ✅ |
| `token_audit_logs` | Logs de tokens | ✅ |

### 4.2 Funções do Banco

| Função | Propósito | Usada? |
|--------|-----------|--------|
| `get_user_company_id(user_id)` | Retorna company_id do usuário | ✅ Sim |
| `has_role(user_id, role)` | Verifica papel do usuário | ✅ Sim |
| `is_saas_admin(user_uuid)` | Verifica se é admin SaaS | ✅ Sim |
| `check_company_access(company_uuid)` | Verifica acesso (trial, assinatura) | ❌ **NUNCA CHAMADA** |
| `create_company_for_user(name, slug)` | Cria empresa para usuário | ✅ Sim |
| `regenerate_company_token(company_id, type)` | Regenera token | ✅ Sim |
| `handle_new_company_links()` | Cria links para nova empresa | ❌ **TRIGGER NÃO ANEXADO** |

### 4.3 Triggers

```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public';
-- RESULTADO: 0 triggers ativos
```

**⚠️ PROBLEMA:** A função `handle_new_company_links()` existe mas NÃO está anexada como trigger.

### 4.4 Enums

| Enum | Valores |
|------|---------|
| `order_status` | novo, preparo, pronto, em_rota, entregue |
| `app_role` | admin, employee |
| `store_profile` | conservative, balanced, aggressive |

---

## 5. AUTENTICAÇÃO E AUTORIZAÇÃO

### 5.1 Fluxo de Autenticação

```
1. Usuário faz login (email/senha)
           ↓
2. Supabase Auth valida e retorna JWT
           ↓
3. Profile é carregado (company_id)
           ↓
4. Role é verificada via user_roles
           ↓
5. RLS permite/bloqueia operações
```

### 5.2 Papéis

| Role | Permissões |
|------|------------|
| `admin` | CRUD completo em todas as tabelas da empresa |
| `employee` | Visualização e operações limitadas |

### 5.3 Contexto de Segurança

```typescript
// AuthContext.tsx
const { user, company, signIn, signOut } = useAuth();

// Profile é carregado automaticamente após login
// company_id é usado para filtrar dados
```

### 5.4 Status

| Funcionalidade | Status |
|----------------|--------|
| Login/Logout | ✅ Implementado |
| Registro | ✅ Implementado |
| Auto-confirm email | ✅ Configurado |
| Recuperação de senha | ⚠️ Parcial (UI existe) |
| RLS por company_id | ✅ Implementado |
| Verificação de roles | ✅ Implementado |

---

## 6. MÓDULO SAAS (ADMIN DO SISTEMA)

### 6.1 Rotas SaaS

| Rota | Componente | Função |
|------|------------|--------|
| `/saas` | `SaasDashboard` | Dashboard geral |
| `/saas/companies` | `SaasCompanies` | Gestão de empresas |
| `/saas/plans` | `SaasPlans` | Gestão de planos |
| `/saas/subscriptions` | `SaasSubscriptions` | Gestão de assinaturas |
| `/saas/templates` | `SaasTemplates` | Templates de cardápio |
| `/saas/audit` | `SaasAudit` | Logs de auditoria |

### 6.2 Status das Funcionalidades

| Funcionalidade | Status | Evidência |
|----------------|--------|-----------|
| Dashboard | ✅ Implementado | Estatísticas exibidas |
| Listar empresas | ✅ Implementado | CRUD completo |
| Ativar/desativar empresa | ✅ Implementado | Toggle funciona |
| Suspender com motivo | ✅ Implementado | Campo `suspended_reason` |
| Gestão de planos | ✅ Implementado | 3 planos cadastrados |
| Gestão de assinaturas | ⚠️ Parcial | 0 assinaturas criadas |
| Clonagem de cardápio | ⚠️ Parcial | Edge function existe |
| Auditoria | ✅ Implementado | Logs funcionam |
| **Bloqueio automático** | ❌ **NÃO IMPLEMENTADO** | Função não é chamada |

### 6.3 Planos Cadastrados

| Plano | Preço | Status |
|-------|-------|--------|
| Starter | R$ 99/mês | ✅ Ativo |
| Professional | R$ 199/mês | ✅ Ativo |
| Enterprise | R$ 399/mês | ✅ Ativo |

### 6.4 Acesso ao SaaS

```typescript
// useSaasAdmin.ts
const { data } = await supabase.rpc('is_saas_admin');
// Retorna true se user_id está em saas_admins
```

---

## 7. COBRANÇA E ASSINATURAS

### 7.1 Status Atual

| Funcionalidade | Status |
|----------------|--------|
| Tabela `plans` | ✅ Existe (3 registros) |
| Tabela `subscriptions` | ✅ Existe (0 registros) |
| Webhook Asaas | ⚠️ Código existe, nunca testado |
| Webhook MercadoPago | ⚠️ Código existe, nunca testado |
| Checkout de assinatura | ❌ **NÃO EXISTE** |
| Página de pagamento | ❌ **NÃO EXISTE** |
| Grace period | ❌ **NÃO FUNCIONAL** |
| Bloqueio por inadimplência | ❌ **NÃO IMPLEMENTADO** |

### 7.2 Fluxo Esperado (Não Implementado)

```
1. Cliente escolhe plano
           ↓
2. Redireciona para checkout (Asaas/MP)
           ↓
3. Pagamento processado
           ↓
4. Webhook recebido
           ↓
5. Assinatura criada/atualizada
           ↓
6. Acesso liberado/bloqueado
```

### 7.3 Função de Verificação (NÃO USADA)

```sql
-- check_company_access(company_uuid) existe MAS
-- não é chamada em NENHUM lugar do código
```

---

## 8. CARDÁPIO DIGITAL

### 8.1 Estrutura Hierárquica

```
Empresa (company)
    └── Categorias (categories)
            └── Subcategorias (subcategories)
                    └── Produtos (products)
```

### 8.2 Flags de Exibição por Canal

| Campo | Canal |
|-------|-------|
| `aparece_delivery` | Cardápio Delivery |
| `aparece_qrcode` | Menu QR Code |
| `aparece_totem` | Totem de Autoatendimento |
| `aparece_tv` | Display de TV |
| `aparece_tablet` | Tablet (mesa) |

### 8.3 Status

| Funcionalidade | Status |
|----------------|--------|
| CRUD Categorias | ✅ Implementado |
| CRUD Subcategorias | ✅ Implementado |
| CRUD Produtos | ✅ Implementado |
| Flags por canal | ✅ Implementado |
| Imagem do produto | ❌ Campo não existe |
| Destaque por horário | ⚠️ Campo existe, UI incompleta |
| Ordem de exibição | ✅ Implementado |

### 8.4 Hooks

| Hook | Arquivo | Função |
|------|---------|--------|
| `useCategories` | `useCategories.ts` | CRUD categorias |
| `useSubcategories` | `useSubcategories.ts` | CRUD subcategorias |
| `useProducts` | `useProducts.ts` | CRUD produtos |
| `useMenuByToken` | `useMenuByToken.ts` | Cardápio público |

---

## 9. LINKS PÚBLICOS E TOKENS

### 9.1 Canais e Prefixos

| Canal | Prefixo | Rota | Exemplo Token |
|-------|---------|------|---------------|
| Menu Delivery | `m_` | `/m/:token` | `m_a1b2c3d4e5f6...` |
| QR Code | `q_` | `/q/:token` | `q_a1b2c3d4e5f6...` |
| Totem | `t_` | `/t/:token` | `t_a1b2c3d4e5f6...` |
| TV | `tv_` | `/tv/t/:token` | `tv_a1b2c3d4e5f6...` |
| Roleta | `r_` | `/r/:token` | `r_a1b2c3d4e5f6...` |

### 9.2 Validação de Token

```typescript
// tokenValidation.ts
export const validateTokenPrefix = (token: string, expectedPrefix: string) => {
  return token?.startsWith(expectedPrefix);
};
```

### 9.3 Regeneração de Token

```sql
-- regenerate_company_token(company_id, token_type)
-- Gera novo token, invalida antigo, registra em token_audit_logs
```

### 9.4 Status

| Funcionalidade | Status |
|----------------|--------|
| Tokens v2 com prefixo | ✅ Implementado |
| Validação de prefixo | ✅ Implementado |
| Regeneração | ✅ Implementado |
| Logs de auditoria | ✅ Implementado |
| Página "Meus Links" | ✅ Implementado |
| **Verificação de empresa ativa** | ❌ **NÃO IMPLEMENTADO** |

### 9.5 Falha de Segurança

```typescript
// PublicMenuByToken.tsx - NÃO verifica is_active
const { company } = useMenuByToken(token, 'menu');
// Deveria ter: if (!company?.is_active) return <Blocked />
```

---

## 10. SISTEMA DE PEDIDOS

### 10.1 Estados do Pedido (Kanban)

| Status | Cor | Descrição |
|--------|-----|-----------|
| `novo` | Azul | Aguardando aceitação |
| `preparo` | Amarelo | Em preparação |
| `pronto` | Verde | Pronto para entrega |
| `em_rota` | Roxo | Em rota de entrega |
| `entregue` | Cinza | Finalizado |

### 10.2 Fluxo do Pedido

```
1. Cliente acessa cardápio (/m/:token)
           ↓
2. Adiciona produtos ao carrinho
           ↓
3. Preenche dados (nome, telefone, endereço)
           ↓
4. Envia pedido (cria no banco + abre WhatsApp)
           ↓
5. Pedido aparece no Kanban como "novo"
           ↓
6. Operador move entre colunas
           ↓
7. Atribui entregador (se delivery)
           ↓
8. Finaliza como "entregue"
```

### 10.3 Status

| Funcionalidade | Status |
|----------------|--------|
| Kanban visual | ✅ Implementado |
| Drag and drop | ✅ Implementado |
| Realtime | ✅ Implementado |
| Som de notificação | ✅ Implementado |
| Impressão automática | ✅ Implementado |
| Atribuição de entregador | ✅ Implementado |
| Acerto financeiro | ✅ Implementado |
| Fechamento de caixa | ✅ Implementado |
| **Pagamento online** | ❌ NÃO EXISTE |

### 10.4 Carrinho e Checkout

```typescript
// CartContext.tsx
const { items, addItem, removeItem, total, checkout } = useCart();

// Checkout cria pedido no banco + abre WhatsApp
// NÃO processa pagamento
```

---

## 11. SISTEMA DE TV

### 11.1 Funcionalidades

| Funcionalidade | Status |
|----------------|--------|
| Exibição de banners | ✅ Implementado |
| Exibição de produtos | ✅ Implementado |
| Rotação automática | ✅ Implementado |
| Token por TV | ✅ Implementado |
| Múltiplas telas | ⚠️ Parcial |
| Programação por horário | ⚠️ Parcial (tabela existe) |
| IA de TV | ⚠️ Parcial (edge function existe) |
| Modo offline | ✅ Implementado |
| Refresh automático | ✅ Implementado (60s) |

### 11.2 Rotas

| Rota | Descrição |
|------|-----------|
| `/tv/t/:token` | TV por token (atual) |
| `/tv/:token` | TV por token (legado) |
| `/tv-screens` | Gestão de TVs (admin) |

### 11.3 Componentes

| Componente | Arquivo | Função |
|------------|---------|--------|
| `PublicTVByToken` | `PublicTVByToken.tsx` | Exibição pública |
| `TVScreens` | `TVScreens.tsx` | Gestão admin |

---

## 12. INTELIGÊNCIA ARTIFICIAL

### 12.1 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                   SELF-HOSTED AI PROVIDERS                    │
│             (Configurado por empresa via UI)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ IA GESTORA   │  │ IA ASSISTENTE│  │ IA TV/CAMPANHAS  │   │
│  │ ai-manager   │  │ ai-assistant │  │ ai-tv-scheduler  │   │
│  │              │  │              │  │ ai-campaigns     │   │
│  │ Main AI +    │  │ Main AI +    │  │ Main AI +        │   │
│  │ Fallback     │  │ Fallback     │  │ Fallback         │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 IA Assistente

| Funcionalidade | Status |
|----------------|--------|
| Chat funcional | ⚠️ Parcial (recém migrado) |
| Análise de texto | ✅ Implementado |
| Análise de imagem | ⚠️ Parcial (usa Gemini Pro) |
| Análise de PDF | ⚠️ Parcial (parsing básico) |
| Transcrição de áudio | ❌ **REMOVIDO** |
| TTS | ⚠️ Parcial |
| Persistência de mensagens | ✅ Implementado |
| Contexto de empresa | ✅ Implementado |

### 12.3 IA Gestora

| Funcionalidade | Status |
|----------------|--------|
| Análise de vendas | ⚠️ Parcial (0 dados) |
| Geração de recomendações | ⚠️ Parcial (0 geradas) |
| Explicabilidade | ⚠️ Parcial |
| Ações automáticas | ❌ NÃO EXISTE |
| Medição de impacto | ⚠️ Parcial (tabela vazia) |

### 12.4 IA Criativa

| Funcionalidade | Status |
|----------------|--------|
| Sugestão de nomes | ❌ NÃO IMPLEMENTADO |
| Sugestão de descrição | ❌ NÃO IMPLEMENTADO |
| Sugestão de combos | ❌ NÃO IMPLEMENTADO |
| Sugestão de remoção | ❌ NÃO IMPLEMENTADO |

### 12.5 Modelos Utilizados

| Edge Function | Modelo |
|---------------|--------|
| ai-assistant | google/gemini-2.5-flash (texto) |
| ai-assistant | google/gemini-2.5-pro (imagem) |
| ai-manager | google/gemini-2.5-flash |
| ai-campaigns | google/gemini-2.5-flash |
| ai-tv-scheduler | google/gemini-2.5-flash |

---

## 13. MARKETING E CAMPANHAS

### 13.1 Tracking

| Ferramenta | Status |
|------------|--------|
| Google Analytics 4 | ✅ Implementado |
| Meta Pixel | ✅ Implementado |
| Google Tag Manager | ✅ Implementado |

### 13.2 Campanhas

| Funcionalidade | Status |
|----------------|--------|
| Criação de campanhas | ⚠️ Parcial (UI existe) |
| Envio automático | ❌ NÃO FUNCIONAL |
| WhatsApp API | ❌ NÃO INTEGRADO |
| Mensagem em massa | ❌ NÃO FUNCIONAL |
| Recompra automática | ⚠️ Parcial (edge function) |
| Aniversário | ❌ Campo não existe |

### 13.3 Hooks

| Hook | Arquivo |
|------|---------|
| `useCampaigns` | `useCampaigns.ts` |
| `useMarketingSettings` | `useMarketingSettings.ts` |
| `useRepurchase` | `useRepurchase.ts` |

---

## 14. GAMIFICAÇÃO (ROLETA)

### 14.1 Estrutura

```
prizes (Prêmios configurados)
    └── prize_wins (Ganhadores registrados)
```

### 14.2 Status

| Funcionalidade | Status |
|----------------|--------|
| Configuração de prêmios | ✅ Implementado |
| UI da roleta | ✅ Implementado |
| Spin e sorteio | ⚠️ Parcial |
| Registro de ganhadores | ✅ Implementado |
| Resgate de prêmio | ⚠️ Parcial |
| Limite de spins | ❌ NÃO IMPLEMENTADO |

### 14.3 Rotas

| Rota | Descrição |
|------|-----------|
| `/r/:token` | Roleta pública |
| `/prizes` | Gestão de prêmios (admin) |

---

## 15. EDGE FUNCTIONS

### 15.1 Funções Deployadas (18 total)

| Function | JWT | Propósito | Status |
|----------|-----|-----------|--------|
| `ai-assistant` | false | Chat IA multimodal | ⚠️ Recém migrado |
| `ai-campaigns` | false | Geração de campanhas | ⚠️ Nunca executado |
| `ai-chat` | false | Chat simples | ⚠️ Existe |
| `ai-manager` | false | Orquestrador IA | ⚠️ Nunca executado |
| `ai-menu-creative` | false | Sugestões de cardápio | ⚠️ Existe |
| `ai-menu-highlight` | false | Destaques de menu | ⚠️ Existe |
| `ai-repurchase` | false | Previsão recompra | ⚠️ Nunca executado |
| `ai-tts` | false | Text-to-Speech | ⚠️ Existe |
| `ai-tv-highlight` | false | Destaques TV | ⚠️ Existe |
| `ai-tv-scheduler` | false | Agenda TV | ⚠️ Existe |
| `analyze-business` | false | Análise de negócio | ⚠️ Existe |
| `clone-company-menu` | true | Clonagem cardápio | ⚠️ Nunca testado |
| `run-qa-tests` | true | Testes QA | ⚠️ Existe |
| `send-whatsapp` | false | Envio WhatsApp | ⚠️ Incompleto |
| `test-token-stability` | true | Teste tokens | ⚠️ Existe |
| `test-tv` | true | Teste TV | ⚠️ Existe |
| `webhook-asaas` | false | Pagamentos Asaas | ⚠️ Nunca testado |
| `webhook-mercadopago` | false | Pagamentos MP | ⚠️ Nunca testado |

### 15.2 Secrets Configuradas

| Secret | Status |
|--------|--------|
| `SUPABASE_URL` | ✅ Configurada |
| `SUPABASE_ANON_KEY` | ✅ Configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Configurada |
| `AI Provider Keys` | ✅ Via UI (ai_provider_config) |
| `OPENAI_API_KEY` | ❌ NÃO configurada (apenas TTS) |

---

## 16. ROTAS DA APLICAÇÃO

### 16.1 Rotas Administrativas (Autenticadas)

| Rota | Componente | Função |
|------|------------|--------|
| `/` | `Dashboard` | Visão geral |
| `/orders` | `Orders` | Kanban de pedidos |
| `/products` | `Products` | Gestão de produtos |
| `/categories` | `Categories` | Gestão de categorias |
| `/subcategories` | `Subcategories` | Gestão de subcategorias |
| `/customers` | `Customers` | Gestão de clientes |
| `/deliverers` | `Deliverers` | Gestão de entregadores |
| `/settlement` | `DelivererSettlement` | Acerto financeiro |
| `/banners` | `Banners` | Gestão de banners |
| `/tv-screens` | `TVScreens` | Gestão de TVs |
| `/prizes` | `Prizes` | Gestão de prêmios |
| `/campaigns` | `Campaigns` | Campanhas de marketing |
| `/repurchase` | `Repurchase` | Sugestões de recompra |
| `/ai-recommendations` | `AIRecommendations` | Recomendações IA |
| `/ai-suggestions` | `AISuggestions` | Sugestões criativas |
| `/time-highlights` | `TimeHighlights` | Destaques por horário |
| `/my-links` | `MyLinks` | Links públicos |
| `/marketing` | `Marketing` | Configurações marketing |
| `/company` | `Company` | Dados da empresa |
| `/settings` | `Settings` | Configurações |
| `/users` | `Users` | Gestão de usuários |
| `/qa` | `QA` | Testes do sistema |
| `/auth` | `Auth` | Login/Registro |

### 16.2 Rotas SaaS

| Rota | Componente |
|------|------------|
| `/saas` | `SaasDashboard` |
| `/saas/companies` | `SaasCompanies` |
| `/saas/plans` | `SaasPlans` |
| `/saas/subscriptions` | `SaasSubscriptions` |
| `/saas/templates` | `SaasTemplates` |
| `/saas/audit` | `SaasAudit` |

### 16.3 Rotas Públicas (Token)

| Rota | Componente | Canal |
|------|------------|-------|
| `/m/:token` | `PublicMenuByToken` | Delivery |
| `/q/:token` | `PublicQRCodeByToken` | QR Code |
| `/t/:token` | `PublicTotemByToken` | Totem |
| `/tv/t/:token` | `PublicTVByToken` | TV |
| `/r/:token` | `PublicRoletaByToken` | Roleta |

---

## 17. FALHAS CRÍTICAS

### 🔴 SHOWSTOPPERS

1. **Bloqueio de acesso NÃO funciona**
   - `check_company_access()` existe mas NUNCA é chamada
   - Empresas inativas acessam normalmente
   - Assinaturas vencidas não bloqueiam

2. **Fluxo de pagamento NÃO existe**
   - Não há checkout
   - Não há integração com gateway
   - Webhooks nunca receberam dados

3. **Páginas públicas não verificam status**
   - Cardápio acessível com empresa inativa
   - TV acessível com empresa suspensa
   - Roleta acessível sem verificação

4. **Trigger de criação não está anexado**
   - `handle_new_company_links` é função, não trigger
   - Novos `company_public_links` só por INSERT manual

5. **IA nunca validada com dados reais**
   - 0 produtos, 0 pedidos, 0 clientes
   - Impossível avaliar qualidade das sugestões

---

## 18. FUNCIONALIDADES AUSENTES

### ❌ Não Implementadas

1. Checkout com pagamento online (Pix, cartão)
2. Integração real com WhatsApp API
3. Envio automático de campanhas
4. Bloqueio automático por inadimplência
5. Página de reativação/pagamento
6. Campo de aniversário em clientes
7. Notificações push
8. Relatórios exportáveis
9. Imagem de produto
10. Controle de estoque
11. Cupons de desconto
12. Programa de fidelidade completo
13. Integração iFood/Rappi
14. Transcrição de áudio (Whisper removido)
15. Limites de plano verificados

---

## 19. RISCOS PARA PRODUÇÃO

### 🔴 Riscos Críticos

| Risco | Impacto | Probabilidade |
|-------|---------|---------------|
| Cliente paga e fica bloqueado | Reputação destruída | Alta |
| Cliente não paga e usa | Prejuízo financeiro | 100% |
| Dados de IA incorretos | Decisões erradas | Alta |
| Vazamento de cardápio | Perda de credibilidade | 100% |
| Edge functions falham | IA "morta" | Média |
| Limites não verificados | Uso ilimitado | 100% |

### ⚠️ Riscos Técnicos

1. Sem testes automatizados
2. Sem monitoramento
3. Sem backup strategy além do Supabase
4. Sem versionamento de API
5. IA depende de chave API configurada pelo usuário via UI

---

## 20. PRIORIDADES TÉCNICAS

### Ordem de Implementação

| # | Prioridade | Esforço | Impacto |
|---|------------|---------|---------|
| 1 | Implementar verificação de `check_company_access()` | 4h | Crítico |
| 2 | Criar trigger para `handle_new_company_links` | 1h | Crítico |
| 3 | Implementar fluxo de checkout com pagamento | 40h | Crítico |
| 4 | Verificar status da empresa em páginas públicas | 2h | Crítico |
| 5 | Testar webhooks com dados reais | 8h | Alto |
| 6 | Implementar limites de plano | 16h | Alto |
| 7 | Criar página de reativação de conta | 8h | Alto |
| 8 | Adicionar campo de imagem aos produtos | 4h | Médio |
| 9 | Integrar WhatsApp API real | 24h | Médio |
| 10 | Implementar testes automatizados | 40h | Médio |

---

## CONCLUSÃO

O sistema Zoopi possui uma **arquitetura bem desenhada** com:
- ✅ Estrutura de banco de dados completa (39 tabelas)
- ✅ Componentes de UI funcionais
- ✅ Edge functions preparadas (18 funções)
- ✅ RLS em todas as tabelas
- ✅ IA Self-Hosted com Main + Fallback

**PORÉM**, está em estado de **protótipo funcional**, não de produto comercial:
- ❌ Cobrança não funciona
- ❌ Bloqueio não funciona
- ❌ IA nunca foi validada
- ❌ Zero dados reais para teste

**Estimativa para MVP comercial:** 80-120 horas de desenvolvimento focado nas prioridades críticas.

---

**Documentação gerada para análise técnica imparcial.**  
**Última atualização:** 25/12/2025
