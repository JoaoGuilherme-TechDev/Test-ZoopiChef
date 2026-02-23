# 🔍 AUDITORIA TÉCNICA COMPLETA DO SISTEMA ZOOPI

**Data:** 26/12/2024  
**Tipo:** Auditoria técnica de arquitetura, segurança e funcionalidades  
**Status:** APENAS LEITURA - Nenhuma modificação realizada

---

## ETAPA A — VISÃO GERAL DO SISTEMA

### Arquitetura Real

O Zoopi é um **SaaS multi-tenant para restaurantes** construído com:

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions + Storage)
- **IA:** Self-Hosted (OpenAI, Gemini, Groq, Grok, LLaMA, Anthropic)
- **Estado:** React Query para cache e sincronização

### Estrutura de Módulos

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMADA SaaS                               │
│  /saas/* - Dashboard, Empresas, Planos, Assinaturas, Audit      │
│  (Acesso: saas_admins)                                           │
├─────────────────────────────────────────────────────────────────┤
│                      CAMADA CORE (Empresa)                       │
│  Dashboard, Cardápio, Pedidos, Clientes, Campanhas, IA, Config  │
│  (Acesso: profiles.company_id + user_roles)                     │
├─────────────────────────────────────────────────────────────────┤
│                      CAMADA PÚBLICA                              │
│  /m/:token - Menu Digital                                        │
│  /q/:token - QR Code Mesa                                        │
│  /t/:token - Totem Autoatendimento                               │
│  /tv/:token - TV Display                                         │
│  /r/:token - Roleta de Prêmios                                   │
│  (Acesso: tokens públicos, sem auth)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Pontos de Entrada

| Tipo | Rota | Proteção |
|------|------|----------|
| Auth | /auth | Supabase Auth |
| SaaS Admin | /saas/* | saas_admins + is_saas_admin() |
| Core | /* (dashboard) | AuthContext + CompanyAccessGuard |
| Público | /m/:token, /q/:token, etc. | Tokens públicos, check_company_access() |
| Webhooks | Edge Functions | Headers + validação de payload |

### Limites Claros

1. **SaaS vs Core:** SaaS opera sobre TODAS as empresas; Core opera sobre UMA empresa (isolada por company_id)
2. **Core vs Público:** Core exige autenticação; Público usa tokens e verifica apenas status da empresa
3. **Auth vs RLS:** Auth gerencia sessão; RLS garante isolamento no banco

---

## ETAPA B — MAPA DO BANCO DE DADOS

### Agrupamento por Domínio

#### 🏢 SAAS / BILLING (6 tabelas)
| Tabela | Função |
|--------|--------|
| `saas_admins` | Lista de usuários admin do SaaS |
| `saas_audit_logs` | Log de ações administrativas |
| `saas_events` | Eventos genéricos do SaaS |
| `plans` | Planos de assinatura |
| `subscriptions` | Vínculo empresa-plano |
| `invoices` | Faturas e pagamentos |

#### 🏪 EMPRESAS / CORE (6 tabelas)
| Tabela | Função |
|--------|--------|
| `companies` | Empresas (tenants) |
| `profiles` | Perfis de usuários vinculados a empresas |
| `user_roles` | Roles (admin/employee) - REFERENCIADA MAS NÃO VISTA |
| `company_public_links` | Tokens públicos (menu, qrcode, totem, tv, roleta) |
| `company_integrations` | Config de integrações (WhatsApp, Pix) |
| `company_marketing_settings` | Config de marketing (GA4, GTM, Meta Pixel) |
| `company_ai_settings` | Config de IA por empresa |

#### 🍔 CARDÁPIO (5 tabelas)
| Tabela | Função |
|--------|--------|
| `categories` | Categorias de produtos |
| `subcategories` | Subcategorias |
| `products` | Produtos do cardápio |
| `banners` | Banners promocionais |
| `menu_versions` / `menu_version_items` | Versionamento de cardápio |

#### 📦 PEDIDOS (4 tabelas)
| Tabela | Função |
|--------|--------|
| `orders` | Pedidos |
| `order_items` | Itens de pedido |
| `customers` | Clientes |
| `deliverers` | Entregadores |
| `cash_closings` | Fechamento de caixa |

#### 🪑 MESAS (2 tabelas)
| Tabela | Função |
|--------|--------|
| `tables` | Mesas do restaurante |
| `table_events` | Eventos (chamar garçom, pedir conta) |

#### 📢 CAMPANHAS / CRM (5 tabelas)
| Tabela | Função |
|--------|--------|
| `campaigns` | Campanhas de marketing |
| `campaign_messages` | Mensagens enviadas |
| `campaign_opt_outs` | Opt-outs de clientes |
| `campaign_settings` | Config de campanhas |
| `repurchase_suggestions` | Sugestões de recompra (IA) |

#### 🎰 GAMIFICAÇÃO (3 tabelas)
| Tabela | Função |
|--------|--------|
| `prizes` | Prêmios da roleta |
| `prize_wins` | Registros de vitórias |
| `print_sectors` / `product_print_sectors` | Setores de impressão |

#### 🤖 IA (6 tabelas)
| Tabela | Função |
|--------|--------|
| `ai_recommendations` | Recomendações da IA |
| `ai_recommendation_impacts` | Impacto das recomendações aplicadas |
| `ai_confidence_scores` | Scores de confiança por tipo |
| `ai_insight_runs` | Histórico de execuções |
| `ai_jobs` | Fila de jobs de IA |
| `ai_chat_messages` | Histórico de chat IA |
| `menu_creative_suggestions` | Sugestões criativas para cardápio |

#### 📺 TV / DISPLAY (1 tabela referenciada)
| Tabela | Função |
|--------|--------|
| `tv_screens` | Telas de TV configuradas |

### ⚠️ Inconsistências de Naming

1. **Mistura de idiomas:** `aparece_tv`, `aparece_delivery` vs `active`, `status`
2. **Sufixo _json inconsistente:** `features_json`, `limits_json`, `metadata_json` vs `opening_hours` (que também é JSON)
3. **Tabela user_roles:** Referenciada no código mas não visível no schema fornecido
4. **token_audit_logs:** Referenciada em função mas não visível no schema

---

## ETAPA C — O QUE JÁ ESTÁ FEITO

### ✅ Funcionalidades COMPLETAS

| Área | Feature | Status |
|------|---------|--------|
| **Auth** | Login/Registro com Supabase Auth | ✅ Funcional |
| **Auth** | Auto-confirm email ativado | ✅ Configurado |
| **Multi-tenant** | Isolamento por company_id | ✅ RLS implementado |
| **SaaS** | Dashboard com métricas (MRR, empresas) | ✅ Funcional |
| **SaaS** | CRUD de Planos | ✅ Funcional |
| **SaaS** | CRUD de Empresas | ✅ Funcional |
| **SaaS** | Gerenciamento de Assinaturas | ✅ Funcional |
| **SaaS** | Clone de cardápio entre empresas | ✅ Edge Function |
| **SaaS** | Audit Logs | ✅ Funcional |
| **Cardápio** | CRUD Categorias/Subcategorias/Produtos | ✅ Funcional |
| **Cardápio** | Visibilidade por canal (TV, QR, Totem, Delivery) | ✅ Funcional |
| **Pedidos** | CRUD + Realtime | ✅ Funcional |
| **Pedidos** | Kanban de status | ✅ Funcional |
| **Pedidos** | Atribuição de entregador | ✅ Funcional |
| **Público** | Menu por token (/m/:token) | ✅ Funcional |
| **Público** | QR Code (/q/:token) | ✅ Funcional + V2 |
| **Público** | Totem (/t/:token) | ✅ Funcional + V2 |
| **Público** | TV Display (/tv/:token) | ✅ Funcional |
| **Público** | Roleta (/r/:token) | ✅ Funcional |
| **Tokens** | Sistema de tokens v1 e v2 | ✅ Funcional |
| **Tokens** | Regeneração segura | ✅ RPC segura |
| **IA** | Gestora (ai-manager) com perfil de loja | ✅ Completo |
| **IA** | Chat assistente | ✅ Funcional |
| **IA** | Sugestões criativas de cardápio | ✅ Funcional |
| **Campanhas** | CRUD de campanhas | ✅ Funcional |
| **Campanhas** | Envio WhatsApp (Z-API, Twilio) | ✅ Funcional |
| **Campanhas** | Sugestões de recompra | ✅ Funcional |
| **Billing** | Webhook Mercado Pago | ✅ Implementado |
| **Billing** | Webhook Asaas | ✅ Implementado |
| **Billing** | Controle de acesso por assinatura | ✅ check_company_access() |
| **Onboarding** | Wizard de configuração inicial | ✅ Funcional |
| **KDS** | Kitchen Display System | ✅ Funcional |
| **Tablet Mesa** | Pedidos por mesa | ✅ Funcional |
| **Mesas** | CRUD + Eventos (chamar garçom) | ✅ Funcional |

### 🟡 Funcionalidades PARCIAIS

| Área | Feature | Estado | O que falta |
|------|---------|--------|-------------|
| **IA** | Medição de impacto | Parcial | Avaliação automática após 7 dias não visível |
| **IA** | TTS (Text-to-Speech) | Parcial | Config existe, implementação do ai-tts não verificada |
| **Campanhas** | Scheduler automático | Parcial | ai-campaigns existe mas execução automática não clara |
| **TV** | AI Scheduler | Parcial | ai-tv-scheduler existe mas integração não clara |
| **Impressão** | Setores de impressão | Parcial | UI de config existe, print real depende de hardware |
| **Marketing** | GA4/GTM/Meta Pixel | Parcial | MarketingScripts renderiza, mas tracking events limitados |
| **Versionamento** | Menu versions | Parcial | Tabelas existem, UI de rollback não visível |

### ⚪ Funcionalidades que existem mas NÃO estão integradas

| Feature | Onde existe | Problema |
|---------|-------------|----------|
| `feature_flags` | companies.feature_flags | Usado apenas para totem_v2 e qrcode_v2, sem UI de gerenciamento |
| `opening_hours` | companies.opening_hours | Campo existe, validação de horário não aplicada nos públicos |
| `welcome_message` | companies.welcome_message | Campo existe, não renderizado em lugar algum visível |
| `store_profile` | companies.store_profile | Usado pela IA, mas não há UI para o dono alterar |

---

## ETAPA D — O QUE FALTA

### 🔴 ESSENCIAL (para funcionar corretamente)

| Item | Descrição | Impacto |
|------|-----------|---------|
| **Validação de horário de funcionamento** | opening_hours não impede pedidos fora do horário | Pedidos fora do horário podem ser aceitos |
| **Notificação de novo pedido** | useOrderNotification existe, mas push/som dependem de implementação | Dono pode perder pedidos |
| **Fluxo de pagamento integrado** | Apenas webhooks; não há UI para cliente escolher forma de pagamento no checkout | Depende 100% do WhatsApp |
| **Limite de uso por plano** | get_company_usage() existe, mas enforcement não visível | Empresa pode ultrapassar limites |

### 🟡 IMPORTANTE (para escalar)

| Item | Descrição | Impacto |
|------|-----------|---------|
| **UI para editar store_profile** | Dono não consegue alterar perfil (conservador/equilibrado/agressivo) | Depende de SQL manual |
| **UI para feature_flags** | Ativar Totem V2, QR V2 via painel | Depende de SQL manual |
| **Dashboard de métricas do dono** | Dashboard atual é básico | Sem visibilidade de performance |
| **Paginação em listas longas** | Produtos, pedidos, clientes podem crescer | Queries pesadas |
| **Cache de menus públicos** | Toda request faz query no banco | Escalabilidade |
| **Rate limiting em edge functions** | Apenas try/catch básico | Abuso possível |
| **Logs estruturados** | Console.log apenas | Debugging em produção difícil |

### ⚪ FUTURO / Nice-to-have

| Item | Descrição |
|------|-----------|
| Multi-idioma | Interface apenas em PT-BR |
| App mobile nativo | Apenas PWA |
| Integração iFood/Rappi | Não existe |
| Relatórios exportáveis (PDF/Excel) | Não existe |
| Sistema de cupons/descontos | Não existe |
| Programa de fidelidade | Apenas roleta |

---

## ETAPA E — ERROS E RISCOS

### 🔴 CRÍTICO - Segurança

| Risco | Descrição | Severidade |
|-------|-----------|------------|
| **RLS bypass em order_items** | INSERT policy é `true` - qualquer autenticado pode inserir itens em qualquer pedido | 🔴 ALTO |
| **RLS bypass em orders** | INSERT policy é `true` - qualquer autenticado pode criar pedido para qualquer empresa | 🔴 ALTO |
| **Anonymous insert em table_events** | Permite criar eventos sem autenticação (intencional mas perigoso) | 🟡 MÉDIO |
| **Secrets expostos em edge functions** | MERCADOPAGO_ACCESS_TOKEN, TWILIO_* usados diretamente | 🟡 MÉDIO (se vazarem logs) |

### 🔴 CRÍTICO - Multi-tenant

| Risco | Descrição | Severidade |
|-------|-----------|------------|
| **Vazamento de company_id em público** | Tokens resolvem para company_id que é UUID previsível | 🟡 MÉDIO |
| **Falta de validação de company_id em mutations** | Algumas mutations confiam apenas no RLS | 🟡 MÉDIO |

### 🟡 Performance

| Risco | Descrição |
|-------|-----------|
| **N+1 queries** | useOrders busca todos os itens e filtra no JS |
| **Sem índices visíveis** | Queries por company_id frequentes, índices não verificados |
| **Realtime em todas as orders** | Pode sobrecarregar com muitas empresas |

### 🟡 Arquitetura

| Risco | Descrição |
|-------|-----------|
| **Acoplamento IA-Frontend** | Edge functions retornam JSON complexo, frontend precisa conhecer estrutura |
| **Duplicação de lógica** | formatCurrency, formatPhone aparecem em múltiplos arquivos |
| **Componentes monolíticos** | Algumas pages têm 500+ linhas |

### 🟡 Custos

| Risco | Descrição |
|-------|-----------|
| **Chamadas de IA sem controle** | daily_chat_limit existe mas enforcement não claro |
| **Storage sem cleanup** | Imagens de banners/logos não são deletadas |

---

## ETAPA F — MATURIDADE DO SISTEMA

| Área | Status | Notas |
|------|--------|-------|
| **Autenticação** | 🟩 Sólida | Supabase Auth + RLS bem implementado |
| **Multi-tenant Core** | 🟩 Sólida | company_id presente em todas tabelas relevantes |
| **RLS Policies** | 🟨 Parcial | Maioria ok, mas orders/order_items tem bypass |
| **SaaS Admin** | 🟩 Sólida | Funcional e com audit log |
| **Cardápio** | 🟩 Sólida | CRUD completo e funcional |
| **Pedidos** | 🟩 Sólida | Funcional com realtime |
| **Público (tokens)** | 🟩 Sólida | Sistema v1/v2 bem pensado |
| **IA Gestora** | 🟩 Sólida | Implementação sofisticada com perfis |
| **IA Chat** | 🟨 Parcial | Funcional mas sem histórico persistente no público |
| **Campanhas** | 🟨 Parcial | CRUD ok, automação não clara |
| **Billing** | 🟨 Parcial | Webhooks ok, sem UI de checkout |
| **Feature Flags** | 🟥 Frágil | Existe mas sem UI |
| **Limites de Plano** | 🟨 Parcial | Funções existem, enforcement não claro |
| **Impressão** | 🟨 Parcial | Lógica existe, depende de hardware |
| **Métricas/Analytics** | 🟥 Frágil | Básico, sem dashboards ricos |

---

## ETAPA G — CONCLUSÃO TÉCNICA

### Diagnóstico Geral

O Zoopi é um sistema **bem estruturado** com arquitetura multi-tenant sólida. A separação entre SaaS, Core e Público está clara. A maioria das funcionalidades core (cardápio, pedidos, tokens públicos) está **funcional e pronta para uso**.

**Pontos fortes:**
- Arquitetura multi-tenant com RLS bem aplicado (na maioria)
- Sistema de tokens públicos robusto (v1 + v2)
- IA Gestora sofisticada com perfis de loja
- Edge functions bem estruturadas
- Uso consistente de React Query

**Pontos fracos:**
- RLS em orders/order_items permite bypass
- Falta UI para recursos que existem no banco (feature_flags, store_profile)
- Enforcement de limites de plano não visível
- Algumas edge functions sem tratamento robusto de erros

### Principais Gargalos

1. **Segurança:** Policies de INSERT em orders/order_items
2. **UX:** Recursos existentes sem UI (feature_flags, store_profile)
3. **Operacional:** Validação de horário de funcionamento não aplicada
4. **Escalabilidade:** Queries sem paginação em listas grandes

### Onde NÃO mexer agora

- **AuthContext / CompanyAccessGuard:** Funciona bem, risco alto de quebrar
- **Sistema de tokens:** Bem implementado, não precisa de mudanças
- **RLS existente (exceto orders):** Maioria está correta
- **Edge functions de IA:** Complexas mas funcionais

### Onde concentrar atenção

1. **URGENTE:** Corrigir RLS de orders/order_items para validar company_id
2. **IMPORTANTE:** Criar UI para feature_flags e store_profile
3. **IMPORTANTE:** Implementar validação de opening_hours
4. **MÉDIO:** Adicionar paginação em listas grandes
5. **MÉDIO:** Implementar enforcement de limites de plano

---

## RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Tabelas no banco | ~40 |
| Edge Functions | 18 |
| Pages/Routes | ~50 |
| Hooks customizados | ~35 |
| Funcionalidades completas | ~80% |
| Funcionalidades parciais | ~15% |
| Funcionalidades ausentes | ~5% |
| Riscos críticos de segurança | 2 |
| Riscos médios | 5+ |

**Veredicto:** Sistema em **estágio de MVP avançado**, pronto para uso com ressalvas de segurança. Recomenda-se correção das policies de orders antes de escalar.
