# AUDITORIA COMPLETA DO SISTEMA ZOOPI

**Data da Auditoria:** 25/12/2025  
**Versão:** 1.0

---

## 📋 ÍNDICE

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura de Dados (Supabase)](#2-arquitetura-de-dados-supabase)
3. [Módulos do Sistema](#3-módulos-do-sistema)
4. [Edge Functions (Backend)](#4-edge-functions-backend)
5. [Sistema SaaS Admin](#5-sistema-saas-admin)
6. [Problema: SaaS Não Visível](#6-problema-saas-não-visível)
7. [Funcionalidades por Módulo](#7-funcionalidades-por-módulo)
8. [Rotas da Aplicação](#8-rotas-da-aplicação)
9. [Fluxos de Autenticação](#9-fluxos-de-autenticação)
10. [Integrações Externas](#10-integrações-externas)

---

## 1. VISÃO GERAL DO SISTEMA

### Stack Tecnológico
- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS + shadcn/ui
- **Estado:** TanStack React Query
- **Backend:** Supabase (Lovable Cloud)
- **Autenticação:** Supabase Auth
- **Banco de Dados:** PostgreSQL (via Supabase)
- **Edge Functions:** Deno (Supabase Functions)

### Objetivo do Sistema
Sistema de gestão de cardápio digital para restaurantes/estabelecimentos com:
- Cardápio digital multi-canal (QR Code, Totem, TV, Delivery)
- Gestão de pedidos com Kanban
- Sistema de fidelidade (roleta de prêmios)
- IA para sugestões e campanhas
- Módulo SaaS para gestão multi-empresa

---

## 2. ARQUITETURA DE DADOS (SUPABASE)

### Tabelas Principais (41 tabelas)

#### Módulo Core
| Tabela | Descrição |
|--------|-----------|
| `companies` | Empresas cadastradas no sistema |
| `profiles` | Perfis de usuários vinculados a empresas |
| `user_roles` | Roles de usuários (admin, operator, etc.) |
| `categories` | Categorias do cardápio |
| `subcategories` | Subcategorias do cardápio |
| `products` | Produtos do cardápio |

#### Módulo Pedidos
| Tabela | Descrição |
|--------|-----------|
| `orders` | Pedidos realizados |
| `order_items` | Itens dos pedidos |
| `customers` | Clientes cadastrados |
| `deliverers` | Entregadores |
| `cash_closings` | Fechamentos de caixa |

#### Módulo Marketing/IA
| Tabela | Descrição |
|--------|-----------|
| `campaigns` | Campanhas de marketing |
| `campaign_messages` | Mensagens de campanhas |
| `campaign_settings` | Configurações de campanha |
| `campaign_opt_outs` | Opt-outs de clientes |
| `ai_recommendations` | Recomendações da IA |
| `ai_recommendation_impacts` | Impacto das recomendações |
| `ai_confidence_scores` | Scores de confiança IA |
| `ai_jobs` | Jobs de IA em execução |
| `ai_insight_runs` | Execuções de insights IA |
| `ai_chat_messages` | Histórico chat IA |
| `menu_creative_suggestions` | Sugestões criativas de menu |
| `repurchase_suggestions` | Sugestões de recompra |
| `time_highlight_suggestions` | Sugestões de destaque por horário |

#### Módulo TV/Display
| Tabela | Descrição |
|--------|-----------|
| `tv_schedules` | Agendamentos de TV |
| `tv_schedule_suggestions` | Sugestões de agenda TV |
| `tv_screens` | Telas de TV cadastradas |
| `banners` | Banners promocionais |

#### Módulo Fidelidade
| Tabela | Descrição |
|--------|-----------|
| `prizes` | Prêmios da roleta |
| `prize_wins` | Prêmios ganhos |

#### Módulo SaaS Admin
| Tabela | Descrição |
|--------|-----------|
| `plans` | Planos de assinatura |
| `subscriptions` | Assinaturas das empresas |
| `saas_admins` | Administradores SaaS |
| `saas_audit_logs` | Logs de auditoria SaaS |

#### Módulo Tokens/Links
| Tabela | Descrição |
|--------|-----------|
| `company_public_links` | Links públicos das empresas (tokens v2) |
| `token_audit_logs` | Auditoria de tokens |

#### Módulo Marketing Settings
| Tabela | Descrição |
|--------|-----------|
| `company_marketing_settings` | Configurações de marketing (GA4, Meta Pixel, GTM) |

#### Módulo Versionamento
| Tabela | Descrição |
|--------|-----------|
| `menu_versions` | Versões do cardápio |
| `menu_version_items` | Itens das versões |

### Views
| View | Descrição |
|------|-----------|
| `public_companies` | Dados públicos das empresas |
| `public_marketing_settings` | Configurações públicas de marketing |

---

## 3. MÓDULOS DO SISTEMA

### 3.1 Módulo Empresa
- Criação/edição de empresa
- Configuração de perfil (endereço, WhatsApp, etc.)
- Gestão de usuários e roles

### 3.2 Módulo Cardápio
- Gestão de categorias e subcategorias
- Cadastro de produtos com preços
- Controle de visibilidade por canal (delivery, QR, totem, TV)
- Destaque por horário

### 3.3 Módulo Pedidos
- Kanban de pedidos (pendente → preparando → pronto → entregue)
- Gestão de clientes
- Gestão de entregadores
- Fechamento de caixa

### 3.4 Módulo Multi-Canal
- **Delivery:** Cardápio para pedidos online
- **QR Code:** Cardápio para leitura em mesa
- **Totem:** Cardápio para autoatendimento
- **TV:** Display para exibição em tela grande

### 3.5 Módulo IA
- Sugestões de campanhas
- Recomendações de produtos
- Sugestões criativas de cardápio
- Previsão de recompra
- Destaques por horário

### 3.6 Módulo Fidelidade
- Roleta de prêmios
- Gestão de prêmios
- Histórico de ganhadores

### 3.7 Módulo Marketing
- Campanhas automáticas
- Integração WhatsApp
- Google Analytics 4
- Meta Pixel
- Google Tag Manager

---

## 4. EDGE FUNCTIONS (BACKEND)

### Functions Ativas

| Function | Descrição | Status |
|----------|-----------|--------|
| `ai-assistant` | Assistente IA conversacional | ✅ Ativo |
| `ai-campaigns` | Geração de campanhas via IA | ✅ Ativo |
| `ai-chat` | Chat com IA | ✅ Ativo |
| `ai-manager` | Gerenciador de jobs IA | ✅ Ativo |
| `ai-menu-creative` | Sugestões criativas de menu | ✅ Ativo |
| `ai-menu-highlight` | Destaques de menu via IA | ✅ Ativo |
| `ai-repurchase` | Previsão de recompra | ✅ Ativo |
| `ai-tts` | Text-to-Speech | ✅ Ativo |
| `ai-tv-highlight` | Destaques para TV | ✅ Ativo |
| `ai-tv-scheduler` | Agendador de TV via IA | ✅ Ativo |
| `analyze-business` | Análise de negócio | ✅ Ativo |
| `clone-company-menu` | Clonagem de cardápio entre empresas | ✅ Ativo |
| `run-qa-tests` | Testes de QA automatizados | ✅ Ativo |
| `send-whatsapp` | Envio de WhatsApp | ✅ Ativo |
| `test-token-stability` | Teste de estabilidade de tokens | ✅ Ativo |
| `test-tv` | Teste de TV | ✅ Ativo |
| `webhook-asaas` | Webhook pagamentos Asaas | ✅ Ativo |
| `webhook-mercadopago` | Webhook pagamentos MercadoPago | ✅ Ativo |

---

## 5. SISTEMA SaaS ADMIN

### 5.1 Páginas do Módulo SaaS

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/saas` | `SaasDashboard` | Dashboard com métricas SaaS |
| `/saas/companies` | `SaasCompanies` | Gestão de empresas |
| `/saas/plans` | `SaasPlans` | Gestão de planos |
| `/saas/subscriptions` | `SaasSubscriptions` | Gestão de assinaturas |
| `/saas/templates` | `SaasTemplates` | Templates e clonagem |
| `/saas/audit` | `SaasAudit` | Logs de auditoria |

### 5.2 Planos Configurados

| Plano | Preço | Limites |
|-------|-------|---------|
| **Starter** | R$ 99/mês | 50 produtos, 200 pedidos/mês, 1 TV |
| **Professional** | R$ 199/mês | 200 produtos, 1000 pedidos/mês, 3 TVs |
| **Enterprise** | R$ 499/mês | Ilimitado |

### 5.3 Status das Empresas

| Empresa | Status | Template | Trial |
|---------|--------|----------|-------|
| zoopi chef | ✅ Ativo | ❌ | - |

### 5.4 Assinaturas
**Nenhuma assinatura criada ainda.**

---

## 6. PROBLEMA: SaaS NÃO VISÍVEL

### 🔴 Causa Raiz Identificada

**A tabela `saas_admins` está VAZIA!**

```sql
SELECT * FROM saas_admins LIMIT 10;
-- Resultado: []
```

### Impacto
O hook `useIsSaasAdmin()` verifica se o usuário está na tabela `saas_admins`. Como a tabela está vazia:
1. `isSaasAdmin` retorna `false`
2. O `SaasLayout` redireciona para `/` (dashboard normal)
3. O usuário nunca consegue acessar `/saas/*`

### ✅ Solução
Você precisa adicionar seu `user_id` na tabela `saas_admins`:

```sql
-- Primeiro, descubra seu user_id
SELECT id, email FROM auth.users;

-- Depois, insira na tabela saas_admins
INSERT INTO saas_admins (user_id)
VALUES ('SEU_USER_ID_AQUI');
```

---

## 7. FUNCIONALIDADES POR MÓDULO

### 7.1 Autenticação & Usuários
- [x] Login/Registro com email
- [x] Perfis de usuário
- [x] Roles (admin, operator)
- [x] Multi-empresa

### 7.2 Cardápio
- [x] CRUD de categorias
- [x] CRUD de subcategorias
- [x] CRUD de produtos
- [x] Visibilidade por canal
- [x] Destaque por horário
- [x] Versionamento de cardápio

### 7.3 Pedidos
- [x] Kanban de pedidos
- [x] Atribuição de entregador
- [x] Fechamento de caixa
- [x] Notificação sonora

### 7.4 Multi-Canal
- [x] Links públicos com tokens seguros
- [x] Regeneração de tokens
- [x] Cardápio Delivery
- [x] Cardápio QR Code
- [x] Cardápio Totem
- [x] Display TV

### 7.5 IA
- [x] Assistente conversacional
- [x] Geração de campanhas
- [x] Sugestões de cardápio
- [x] Previsão de recompra
- [x] Agendamento TV

### 7.6 Marketing
- [x] Campanhas WhatsApp
- [x] Integração GA4
- [x] Integração Meta Pixel
- [x] Integração GTM

### 7.7 Fidelidade
- [x] Roleta de prêmios
- [x] Gestão de prêmios
- [x] Histórico de ganhadores

### 7.8 SaaS Admin
- [x] Dashboard métricas
- [x] Gestão de empresas
- [x] Gestão de planos
- [x] Gestão de assinaturas
- [x] Clonagem de templates
- [x] Logs de auditoria
- [x] Webhooks de pagamento (Asaas, MercadoPago)

---

## 8. ROTAS DA APLICAÇÃO

### Rotas Administrativas
```
/                    - Dashboard
/auth                - Login/Registro
/company             - Configuração da empresa
/categories          - Gestão de categorias
/subcategories       - Gestão de subcategorias
/products            - Gestão de produtos
/users               - Gestão de usuários
/settings            - Configurações
/marketing           - Configurações de marketing
/my-links            - Links públicos
/orders              - Gestão de pedidos
/customers           - Gestão de clientes
/deliverers          - Gestão de entregadores
/settlement          - Acerto com entregadores
/banners             - Gestão de banners
/prizes              - Gestão de prêmios
/ai-recommendations  - Recomendações IA
/ai-suggestions      - Sugestões IA
/campaigns           - Campanhas
/repurchase          - Recompra
/time-highlights     - Destaques por horário
/tv-screens          - Telas de TV
/qa                  - Testes QA
```

### Rotas Públicas (Token-based)
```
/m/:token            - Cardápio Delivery
/q/:token            - Cardápio QR Code
/t/:token            - Cardápio Totem
/tv/:token           - Display TV
/r/:token            - Roleta de Prêmios
```

### Rotas Legadas (Slug-based - Compatibilidade)
```
/menu/:slug          - Cardápio Delivery (legado)
/qrcode/:slug        - Cardápio QR Code (legado)
/totem/:slug         - Cardápio Totem (legado)
/tv/s/:slug          - Display TV (legado)
/roleta/:slug        - Roleta de Prêmios (legado)
```

### Rotas SaaS Admin
```
/saas                - Dashboard SaaS
/saas/companies      - Gestão de empresas
/saas/plans          - Gestão de planos
/saas/subscriptions  - Gestão de assinaturas
/saas/templates      - Templates e clonagem
/saas/audit          - Logs de auditoria
```

---

## 9. FLUXOS DE AUTENTICAÇÃO

### Fluxo de Novo Usuário
1. Acessa `/auth`
2. Preenche formulário de registro
3. Supabase Auth cria usuário
4. Trigger cria perfil em `profiles`
5. Redireciona para `/`
6. Se não tem empresa, redireciona para `/company`
7. Cria empresa via `create_company_for_user()`
8. Trigger cria links em `company_public_links`
9. Usuário vira admin da empresa

### Fluxo de Acesso SaaS
1. Usuário logado acessa `/saas`
2. `useIsSaasAdmin()` verifica na tabela `saas_admins`
3. Se `true` → renderiza `SaasLayout`
4. Se `false` → redireciona para `/`

---

## 10. INTEGRAÇÕES EXTERNAS

### Pagamentos
| Provedor | Webhook | Status |
|----------|---------|--------|
| Asaas | `/webhook-asaas` | ✅ Configurado |
| MercadoPago | `/webhook-mercadopago` | ✅ Configurado |

### Marketing
| Plataforma | Integração |
|------------|------------|
| Google Analytics 4 | Via `ga4_measurement_id` |
| Meta Pixel | Via `meta_pixel_id` |
| Google Tag Manager | Via `gtm_container_id` |

### Comunicação
| Canal | Integração |
|-------|------------|
| WhatsApp | Via API Evolution (configurável) |

---

## 📊 RESUMO EXECUTIVO

### ✅ O que está funcionando
- Sistema de empresas e cardápio
- Multi-canal (QR, Totem, TV, Delivery)
- Sistema de pedidos com Kanban
- IA (campanhas, sugestões, recompra)
- Roleta de prêmios
- Webhooks de pagamento
- Edge Functions

### ⚠️ O que precisa de atenção
1. **SaaS Admin inacessível** - Tabela `saas_admins` vazia
2. **Nenhuma assinatura criada** - Empresas sem plano vinculado
3. **Apenas 1 empresa cadastrada** - Sistema em fase inicial

### 🔧 Ações Recomendadas
1. Adicionar seu usuário como SaaS Admin
2. Criar assinatura para a empresa existente
3. Configurar webhooks de pagamento com os provedores
4. Testar fluxo completo de criação de empresa

---

**Documentação gerada automaticamente pelo sistema Zoopi**
