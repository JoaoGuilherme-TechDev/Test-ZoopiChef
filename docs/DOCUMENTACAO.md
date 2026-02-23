# Documentação Técnica e Funcional

**Sistema de Gestão de Pedidos e Cardápio Digital Multi-tenant**

**Versão:** 1.0  
**Última atualização:** Dezembro 2024

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura SaaS Multi-tenant](#2-arquitetura-saas-multi-tenant)
3. [Links Públicos por Token](#3-links-públicos-por-token)
4. [Estrutura de Banco de Dados](#4-estrutura-de-banco-de-dados)
5. [Fluxo do Pedido](#5-fluxo-do-pedido)
6. [Cardápio Digital](#6-cardápio-digital)
7. [Sistema de TV](#7-sistema-de-tv)
8. [Inteligência Artificial](#8-inteligência-artificial)
9. [Gamificação](#9-gamificação)
10. [Segurança](#10-segurança)
11. [QA e Testes Internos](#11-qa-e-testes-internos)
12. [Padrões de UI/UX](#12-padrões-de-uiux)
13. [Pontos Fortes do Sistema](#13-pontos-fortes-do-sistema)
14. [Pontos de Atenção](#14-pontos-de-atenção)

---

## 1. Visão Geral do Sistema

### 1.1 Objetivo do Produto

Sistema completo de gestão para estabelecimentos de alimentação (restaurantes, lanchonetes, pizzarias), oferecendo:

- Cardápio digital multi-canal (delivery, QR code, totem, TV)
- Gestão de pedidos em tempo real (Kanban)
- Controle de entregadores e acerto financeiro
- IA para análise de negócio e sugestões de venda
- Roleta de prêmios para fidelização

### 1.2 Público-Alvo

- **Primário:** Donos e gerentes de estabelecimentos de alimentação
- **Secundário:** Funcionários operacionais (atendentes, cozinheiros)
- **Terciário:** Clientes finais (acesso via cardápio público)

### 1.3 Principais Módulos

| Módulo | Descrição | Acesso |
|--------|-----------|--------|
| Dashboard | Visão geral do negócio | Admin/Employee |
| Pedidos | Kanban de gestão de pedidos | Admin/Employee |
| Cardápio | Gestão de categorias, subcategorias e produtos | Admin |
| Clientes | Base de clientes cadastrados | Admin |
| Entregadores | Gestão de entregadores e acerto | Admin |
| Banners | Gestão de banners para TV | Admin |
| TV Screens | Configuração de múltiplas TVs | Admin |
| IA Gestora | Recomendações inteligentes | Admin |
| Prêmios | Configuração da roleta | Admin |
| Meus Links | URLs públicas de acesso | Admin |
| QA | Testes automatizados do sistema | Admin |

### 1.4 Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| React 18 | Framework frontend |
| TypeScript | Tipagem estática |
| Vite | Build tool |
| Tailwind CSS | Estilização |
| Shadcn/UI | Componentes UI |
| Supabase | Backend (Auth, Database, Edge Functions, Storage) |
| TanStack Query | Gerenciamento de estado servidor |
| React Router | Navegação |
| Lucide React | Ícones |

---

## 2. Arquitetura SaaS Multi-tenant

### 2.1 Modelo Multi-tenant

O sistema utiliza arquitetura **multi-tenant com banco compartilhado**, onde:

- Todas as empresas compartilham as mesmas tabelas
- Cada registro possui coluna `company_id` para identificação do tenant
- Isolamento garantido por Row Level Security (RLS)

```
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS ÚNICO                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Empresa A  │  │  Empresa B  │  │  Empresa C  │          │
│  │ company_id  │  │ company_id  │  │ company_id  │          │
│  │    = X      │  │    = Y      │  │    = Z      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│              RLS POLICIES (Row Level Security)               │
│         Garantem que cada empresa só vê seus dados           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Isolamento por company_id

Toda tabela sensível possui coluna `company_id` que:

1. É preenchida obrigatoriamente na criação do registro
2. É validada pelo RLS em todas as operações (SELECT, INSERT, UPDATE, DELETE)
3. Nunca é exposta ou modificável pelo frontend

### 2.3 Row Level Security (RLS)

Cada tabela possui policies específicas. Exemplo para `products`:

```sql
-- Users can view products in their company
CREATE POLICY "Users can view products in their company" 
ON public.products FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

-- Admins can insert products in their company
CREATE POLICY "Admins can insert products in their company"
ON public.products FOR INSERT
WITH CHECK ((company_id = get_user_company_id(auth.uid())) 
            AND has_role(auth.uid(), 'admin'));
```

### 2.4 Funções de Suporte ao RLS

| Função | Descrição |
|--------|-----------|
| `get_user_company_id(user_id)` | Retorna o `company_id` do usuário |
| `has_role(user_id, role)` | Verifica se usuário tem determinada role |
| `validate_token_prefix(token, prefix)` | Valida prefixo de token público |
| `regenerate_company_token(company_id, token_type)` | Regenera token com auditoria |

### 2.5 Fluxo de Autenticação e Papéis

```
┌────────────────────────────────────────────────────────────┐
│                    FLUXO DE AUTENTICAÇÃO                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Usuário faz login (email/senha)                        │
│                     ↓                                      │
│  2. Supabase Auth valida e retorna JWT                     │
│                     ↓                                      │
│  3. Profile é carregado (company_id, full_name)            │
│                     ↓                                      │
│  4. Role é verificada via user_roles                       │
│                     ↓                                      │
│  5. RLS permite/bloqueia operações                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Papéis disponíveis:**

| Role | Permissões |
|------|------------|
| `admin` | CRUD completo em todas as tabelas da empresa |
| `employee` | Visualização e operações limitadas (ex: mover pedidos) |

---

## 3. Links Públicos por Token

### 3.1 Canais Disponíveis

| Canal | Prefixo | Rota Principal | Uso |
|-------|---------|----------------|-----|
| Delivery | `m_` | `/m/:token` | Cardápio para clientes fazerem pedidos |
| QR Code | `q_` | `/q/:token` | Cardápio para leitura por QR code |
| Totem | `t_` | `/t/:token` | Autoatendimento em totens |
| TV | `tv_` | `/tv/t/:token` | Exibição em TVs do estabelecimento |
| Roleta | `r_` | `/r/:token` | Roleta de prêmios para clientes |

### 3.2 Padrão das Rotas

**Rotas por token (preferidas):**
```
/m/{token}      → Menu Delivery
/q/{token}      → QR Code Menu
/t/{token}      → Totem Menu
/tv/t/{token}   → TV Display (padrão atual)
/r/{token}      → Roleta de Prêmios
```

**Rotas por slug (legado - compatibilidade):**
```
/menu/{slug}      → Delivery (legado)
/qrcode/{slug}    → QR Code (legado)
/totem/{slug}     → Totem (legado)
/tv/s/{slug}      → TV por slug (legado)
/roleta/{slug}    → Roleta (legado)
```

> **Nota sobre TV:** TVs individuais gerenciadas em `/tv-screens` usam a rota `/tv/t/:token`. A rota `/tv/:token` também é suportada para compatibilidade com links antigos.

### 3.3 Resolução do company_id via Token

1. Frontend recebe token da URL
2. Consulta `company_public_links` pelo token
3. RLS permite SELECT público (tokens são públicos por design)
4. `company_id` é retornado e usado para carregar dados

```sql
-- Token resolve para company_id
SELECT company_id 
FROM company_public_links 
WHERE menu_token_v2 = 'm_abc123...'
```

### 3.4 Estrutura de Tokens

```
Formato: {prefixo}_{24_caracteres_hex}

Exemplos:
- m_a1b2c3d4e5f6g7h8i9j0k1l2   (Menu)
- tv_x1y2z3w4v5u6t7s8r9q0p1o2  (TV)
- r_m1n2o3p4q5r6s7t8u9v0w1x2   (Roleta)
```

### 3.5 Regeneração de Tokens

Se um token vazar:

1. Admin acessa `/my-links`
2. Clica em "Regenerar" no token desejado
3. Novo token é gerado com prefixo correto
4. Token antigo é invalidado imediatamente
5. Ação é registrada em `token_audit_logs`

---

## 4. Estrutura de Banco de Dados

### 4.1 Tabelas Principais

#### Empresas e Usuários

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `companies` | Empresas cadastradas | `id`, `name`, `slug`, `address`, `whatsapp`, `order_sound_enabled` |
| `profiles` | Perfis de usuários | `id`, `email`, `full_name`, `company_id`, `avatar_url` |
| `user_roles` | Papéis dos usuários | `user_id`, `role` (admin/employee) |

#### Cardápio

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `categories` | Categorias de produtos | `id`, `name`, `company_id`, `active` |
| `subcategories` | Subcategorias | `id`, `name`, `category_id`, `company_id`, `active` |
| `products` | Produtos | `id`, `name`, `price`, `subcategory_id`, flags de exibição |

#### Pedidos

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `orders` | Pedidos | `id`, `status`, `total`, `customer_id`, `deliverer_id`, `order_type`, `payment_method` |
| `order_items` | Itens do pedido | `id`, `order_id`, `product_id`, `quantity`, `unit_price`, `product_name` |
| `customers` | Clientes | `id`, `name`, `whatsapp`, `alerts`, `company_id` |
| `deliverers` | Entregadores | `id`, `name`, `whatsapp`, `active`, `company_id` |
| `cash_closings` | Fechamentos de caixa | `id`, `total_orders`, `total_revenue`, `closed_at`, `notes` |

#### TV e Banners

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `banners` | Banners para TV | `id`, `image_url`, `title`, `display_order`, `active`, `company_id` |
| `tv_screens` | Configuração de TVs | `id`, `name`, `token`, `company_id`, `active` |

#### Gamificação

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `prizes` | Prêmios disponíveis | `id`, `name`, `color`, `probability`, `description`, `active` |
| `prize_wins` | Registro de ganhadores | `id`, `prize_id`, `customer_name`, `customer_phone`, `redeemed`, `redeemed_at` |

### 4.2 Tabelas de IA

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `ai_recommendations` | Recomendações geradas | `id`, `title`, `reason`, `action_type`, `action_payload_json`, `status` |
| `ai_insight_runs` | Histórico de execuções | `id`, `company_id`, `triggered_by_user_id`, `created_at` |
| `ai_chat_messages` | Mensagens do chat IA | `id`, `session_id`, `role`, `content`, `company_id` |

### 4.3 Tabelas de Tokens e Auditoria

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `company_public_links` | Tokens públicos | `company_id`, `menu_token_v2`, `qrcode_token_v2`, `totem_token_v2`, `tv_token_v2`, `roleta_token_v2` |
| `token_audit_logs` | Log de regeneração | `id`, `company_id`, `user_id`, `token_type`, `action`, `created_at` |

### 4.4 Relacionamentos Principais

```
companies
    ├── profiles (1:N)
    ├── categories (1:N)
    │       └── subcategories (1:N)
    │               └── products (1:N)
    ├── orders (1:N)
    │       └── order_items (1:N)
    ├── customers (1:N)
    ├── deliverers (1:N)
    ├── banners (1:N)
    ├── tv_screens (1:N)
    ├── prizes (1:N)
    │       └── prize_wins (1:N)
    ├── ai_recommendations (1:N)
    ├── ai_insight_runs (1:N)
    ├── ai_chat_messages (1:N)
    ├── cash_closings (1:N)
    ├── token_audit_logs (1:N)
    └── company_public_links (1:1)
```

### 4.5 Enums

| Enum | Valores |
|------|---------|
| `order_status` | `novo`, `preparo`, `pronto`, `em_rota`, `entregue` |
| `app_role` | `admin`, `employee` |

---

## 5. Fluxo do Pedido

### 5.1 Do Cardápio ao Pedido Entregue

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DO PEDIDO                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Cliente acessa cardápio (/m/:token)                      │
│                     ↓                                        │
│  2. Adiciona produtos ao carrinho                            │
│                     ↓                                        │
│  3. Preenche dados (nome, telefone, endereço)               │
│                     ↓                                        │
│  4. Escolhe forma de pagamento                              │
│                     ↓                                        │
│  5. Envia pedido via WhatsApp (gera order no banco)          │
│                     ↓                                        │
│  6. Pedido aparece no Kanban como "Novo"                    │
│                     ↓                                        │
│  7. Operador move para "Preparo" (aceita pedido)            │
│      → Som de notificação (se habilitado)                   │
│      → Impressão automática (se habilitada)                 │
│                     ↓                                        │
│  8. Após preparar, move para "Pronto"                       │
│                     ↓                                        │
│  9. Atribui entregador e move para "Em Rota"                │
│                     ↓                                        │
│  10. Após entrega, move para "Entregue"                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Estados do Pedido (Kanban)

| Status | Cor | Descrição |
|--------|-----|-----------|
| `novo` | Azul | Pedido recém-chegado, aguardando aceitação |
| `preparo` | Amarelo | Pedido aceito, em preparação na cozinha |
| `pronto` | Verde | Pedido pronto, aguardando entregador |
| `em_rota` | Roxo | Pedido saiu para entrega |
| `entregue` | Cinza | Pedido finalizado |

### 5.3 Impressão e Som

**Impressão automática:**
- Ativada/desativada por toggle no header
- Dispara ao aceitar pedido (mover de "novo" para "preparo")
- Usa API do navegador (window.print)
- Formatação otimizada para impressoras térmicas
- Preferência persiste no localStorage

**Som de notificação:**
- Ativado/desativado por toggle
- Toca quando há novos pedidos
- Usa Web Audio API
- Persiste preferência no localStorage

### 5.4 Entregador e Acerto

**Atribuição de entregador:**
- Dropdown no card do pedido (status "pronto" ou "em_rota")
- Lista apenas entregadores ativos da empresa
- Registro em `orders.deliverer_id`

**Acerto financeiro:**
- Página `/settlement`
- Lista pedidos por entregador
- Calcula total a receber
- Permite marcar como acertado

### 5.5 Fechamento de Caixa

- Botão "Fechar Caixa" na página de pedidos
- Registra em `cash_closings`:
  - Total de pedidos do período
  - Receita total
  - Notas/observações
  - Timestamp do fechamento

### 5.6 Realtime

- Pedidos usam Supabase Realtime
- Channel: `orders-realtime`
- Eventos: `postgres_changes` (INSERT, UPDATE, DELETE)
- Atualização automática do Kanban

---

## 6. Cardápio Digital

### 6.1 Layout Conceitual

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                                      │
│  ┌─────────┐                                                │
│  │  Logo   │  Nome da Empresa                               │
│  └─────────┘  Badge: "Cardápio Delivery"                    │
│               Endereço | WhatsApp                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CATEGORIA 1                                                 │
│  ├── Subcategoria A                                         │
│  │   ├── Produto 1 ..................... R$ XX,XX          │
│  │   └── Produto 2 ..................... R$ XX,XX          │
│  └── Subcategoria B                                         │
│      └── Produto 3 ..................... R$ XX,XX          │
│                                                              │
│  CATEGORIA 2                                                 │
│  └── ...                                                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  CARRINHO (botão flutuante)                                 │
│  └── Sheet com itens, sugestões IA, checkout               │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Hierarquia de Categorias

```
Categoria (ex: "Lanches")
    └── Subcategoria (ex: "Hambúrgueres")
            └── Produto (ex: "X-Bacon")
```

- Categorias agrupam subcategorias
- Subcategorias agrupam produtos
- Produtos pertencem a exatamente uma subcategoria
- Sistema de 3 níveis (não há sub-subcategorias)

### 6.3 Flags de Exibição

Cada produto possui flags booleanas que controlam onde ele aparece:

| Flag | Descrição | Valor padrão |
|------|-----------|--------------|
| `aparece_delivery` | Exibe no cardápio delivery | `true` |
| `aparece_qrcode` | Exibe no cardápio QR code | `true` |
| `aparece_totem` | Exibe no totem | `true` |
| `aparece_tv` | Exibe na TV | `true` |
| `aparece_tablet` | Exibe em tablets | `true` |
| `active` | Produto ativo/inativo | `true` |

### 6.4 Diferenças por Canal

| Canal | Particularidades |
|-------|-----------------|
| **Delivery** | Layout compacto, carrinho persistente, checkout com endereço |
| **QR Code** | Similar ao delivery, identificação por mesa (futuro) |
| **Totem** | Layout touch-friendly, botões maiores, auto-reset |
| **TV** | Somente visualização, rotação automática, sem interação |

As diferenças são apenas de CSS e comportamento - os dados vêm das mesmas tabelas.

### 6.5 Componentes do Carrinho

| Componente | Descrição |
|------------|-----------|
| `CartContext` | Estado global do carrinho |
| `CartButton` | Botão flutuante com contador |
| `CartSheet` | Drawer com itens e checkout |
| `ProductCard` | Card de produto clicável |
| `SalesSuggestions` | Sugestões IA no carrinho |

---

## 7. Sistema de TV

### 7.1 Como Funciona

A TV exibe um cardápio visual rotativo com:

1. **Banners:** Imagens promocionais em rotação
2. **Produtos:** Lista de produtos com `aparece_tv=true`
3. **Categorias:** Indicador de categoria atual

### 7.2 Banners

- Cadastrados em `/banners`
- Campos: `image_url`, `title`, `display_order`, `active`
- Armazenados no bucket `banners` (público)
- Rotação automática a cada 8 segundos

### 7.3 Rotação de Conteúdo

| Elemento | Intervalo |
|----------|-----------|
| Banners | 8 segundos |
| Categorias | 15 segundos |
| Refresh de dados | 60 segundos |

### 7.4 Múltiplas TVs por Empresa

- Tabela `tv_screens` permite configurar múltiplas TVs
- Cada TV tem seu próprio token
- Mesma empresa pode ter várias TVs com conteúdo idêntico
- Gestão em `/tv-screens`

### 7.5 Token por TV

```
TV Screen:
  - id: uuid
  - name: "TV Cozinha"
  - token: "tv_abc123..."
  - company_id: uuid
  - active: true

Acesso: /tv/t/tv_abc123...  (padrão atual)
        /tv/tv_abc123...    (compatibilidade)
```

### 7.6 Fallback e Refresh

**Fallback quando não há conteúdo:**
```
┌─────────────────────────────────────┐
│                                     │
│         Nome da Empresa             │
│                                     │
│    "Sem anúncios configurados"      │
│                                     │
└─────────────────────────────────────┘
```

**Comportamento em falha de rede:**
- Mantém último conteúdo carregado
- Não exibe tela preta
- Tenta novo fetch a cada 60s
- Indicador offline no modo debug

**Tratamento de imagens com erro:**
- Banners com imagem quebrada são pulados
- Rotação continua normalmente

### 7.7 Modo Debug

Acesso: `/tv/:token?debug=1`

Exibe overlay com:
- `company_id`
- Quantidade de banners ativos
- Quantidade de produtos TV
- Último refresh (timestamp)
- Status de rede (online/offline)
- Botões: Refresh manual, Tela cheia

### 7.8 Modo Fullscreen

- Botão disponível apenas no modo debug
- Usa API Fullscreen do navegador
- Remove barras e menus
- Impede scroll

---

## 8. Inteligência Artificial

### 8.1 IA Gestora (Recomendações)

Sistema de análise de dados que gera recomendações de negócio.

**Edge Function:** `analyze-business`

**Dados analisados:**
- Pedidos (últimos 30 dias)
- Produtos e categorias
- Clientes
- Entregadores
- Formas de pagamento
- Horários de pico/vale
- Banners e TV

### 8.2 Tipos de Recomendação

| Tipo | Descrição | Prioridade |
|------|-----------|------------|
| `suggest_promo` | Sugerir promoção | 90 |
| `highlight_product` | Destacar produto campeão | 85 |
| `create_combo` | Criar combo | 80 |
| `auto_tv_promo` | Promoção automática TV | 75 |
| `create_tv_banner` | Criar banner TV | 70 |
| `auto_tv_rotation` | Rotação automática TV | 65 |
| `suggest_price_adjust` | Ajustar preço | 60 |
| `suggest_payment_method` | Incentivar forma de pagamento | 50 |
| `suggest_delivery_adjust` | Ajustar entrega | 40 |
| `suggest_operational_adjust` | Ajuste operacional | 30 |

### 8.3 Regras de Análise

1. **Horário de baixa venda** → Sugerir Happy Hour
2. **Gargalo no preparo** → Revisar fluxo de cozinha
3. **Muitos pedidos em dinheiro** → Incentivar Pix
4. **Entregador sobrecarregado** → Redistribuir pedidos
5. **Taxa de entrega mal distribuída** → Ajustar por bairro
6. **Produtos com baixa venda** → Criar promoção
7. **Entregas demoradas** → Verificar entregadores
8. **Clientes inativos** → Cupom de recompra
9. **Produtos campeões** → Destacar na TV
10. **Produtos parados com preço alto** → Reduzir preço
11. **Produtos frequentes juntos** → Criar combo
12. **Campeões sem banner** → Criar banner TV

### 8.4 IA Vendedora (Sugestões no Carrinho)

Componente `SalesSuggestions` que aparece no carrinho.

**Regras implementadas:**

| Regra | Trigger | Sugestão |
|-------|---------|----------|
| Repetir pedido | Cliente recorrente, carrinho vazio | Repetir último pedido |
| Adicionar bebida | Carrinho sem bebida | Bebida mais barata |
| Adicionar extra | Ticket < R$35 | Acompanhamento |
| Upgrade VIP | Cliente especial | Produto premium |

**Keywords para identificação:**
```javascript
DRINK_KEYWORDS = ['refrigerante', 'suco', 'água', 'cerveja', 'coca', ...]
ADDON_KEYWORDS = ['adicional', 'extra', 'porção', 'batata', 'fritas', ...]
```

### 8.5 Limites

| Limite | Valor |
|--------|-------|
| Máximo de recomendações por análise | 5 |
| Máximo de sugestões no carrinho | 3 |
| Período de análise (pedidos) | 30 dias |
| Recomendações ignoradas não repetem por | 7 dias |

### 8.6 Aplicação de Ações

Ao clicar "Aplicar" em uma recomendação:

1. Hook `useApplyRecommendation` processa o `action_payload_json`
2. Ação é executada (ex: criar banner, ajustar preço)
3. Status muda para `applied`
4. Toast de confirmação

Ao clicar "Ignorar":
- Status muda para `dismissed`
- Recomendação não aparece novamente (7 dias)

### 8.7 Chat IA

- Edge Function: `ai-chat`
- Widget flutuante no dashboard
- Histórico persistido em `ai_chat_messages`
- Sessões por `session_id`

---

## 9. Gamificação

### 9.1 Roleta de Prêmios

Componente interativo para engajamento de clientes.

**Acesso público:** `/r/:token`

### 9.2 Cadastro de Prêmios

| Campo | Descrição |
|-------|-----------|
| `name` | Nome do prêmio |
| `description` | Descrição (opcional) |
| `color` | Cor do segmento na roleta (hex) |
| `probability` | Probabilidade (0-100) |
| `active` | Ativo/inativo |

### 9.3 Probabilidades

- Cada prêmio tem probabilidade configurável
- Sistema seleciona prêmio baseado nas probabilidades
- Animação visual da roleta (5 voltas + posição final)
- Duração: 4 segundos
- Transição: cubic-bezier(0.2, 0.8, 0.3, 1)

### 9.4 Registro de Ganhadores

Tabela `prize_wins`:

| Campo | Descrição |
|-------|-----------|
| `prize_id` | Prêmio ganho |
| `customer_name` | Nome do cliente |
| `customer_phone` | Telefone |
| `customer_id` | Referência ao cliente (opcional) |
| `order_id` | Referência ao pedido (opcional) |
| `redeemed` | Se já foi resgatado |
| `redeemed_at` | Data do resgate |

### 9.5 Resgate

- Admin visualiza lista de ganhadores em `/prizes`
- Pode marcar como resgatado
- Histórico completo disponível
- Data de resgate registrada automaticamente

---

## 10. Segurança

### 10.1 Row Level Security (RLS)

Todas as tabelas sensíveis possuem RLS habilitado.

**Padrão de policies:**

```sql
-- SELECT: usuário só vê dados da sua empresa
USING (company_id = get_user_company_id(auth.uid()))

-- INSERT/UPDATE/DELETE: apenas admins da empresa
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
)
```

**Exceções (dados públicos):**

| Tabela | Regra pública |
|--------|---------------|
| `products` | SELECT quando `active=true` e flag de canal |
| `categories` | SELECT quando `active=true` |
| `subcategories` | SELECT quando `active=true` |
| `banners` | SELECT quando `active=true` |
| `prizes` | SELECT quando `active=true` |
| `tv_screens` | SELECT quando `active=true` |
| `company_public_links` | SELECT (resolução de tokens) |
| `companies` | SELECT (dados públicos por slug) |

### 10.2 Proteção de Páginas Públicas

Páginas públicas (`/m/:token`, `/tv/:token`, etc.):

1. **Não requerem autenticação**
2. **Validam token antes de carregar**
3. **Usam RLS para filtrar dados**
4. **Não expõem dados sensíveis**
5. **Validam prefixo do token**

### 10.3 Regeneração de Tokens

Se um token vazar:

1. Admin acessa `/my-links`
2. Clica em "Regenerar" no token desejado
3. Novo token é gerado com prefixo correto
4. Token antigo é invalidado imediatamente
5. Ação é registrada em `token_audit_logs`

**Segurança da função:**
- Apenas admins podem executar
- Verifica company_id do usuário
- Usa SECURITY DEFINER
- Gera log de auditoria

### 10.4 Audit Logs

Tabela `token_audit_logs`:

| Campo | Descrição |
|-------|-----------|
| `company_id` | Empresa afetada |
| `user_id` | Usuário que executou |
| `token_type` | Tipo do token (menu, tv, etc.) |
| `action` | Ação executada (regenerate) |
| `created_at` | Timestamp |

### 10.5 Validação de Tokens

```typescript
// Valida prefixo do token
validateTokenPrefix(token, 'tv')  // true se começa com 'tv_'

// Tokens legados (sem prefixo) ainda funcionam
isLegacyToken(token)  // true se não tem prefixo
```

---

## 11. QA e Testes Internos

### 11.1 Página /qa

Acesso: `/qa` (requer autenticação)

Dashboard de testes automatizados para validar integridade do sistema.

### 11.2 Testes Disponíveis

| Teste | Botão | Descrição |
|-------|-------|-----------|
| Multi-tenant | "Executar Testes" | Valida isolamento entre empresas, tokens, resolução |
| RLS | "Testar RLS" | Tenta acessar dados de outra empresa (deve falhar) |
| Estabilidade Token | "Testar Estabilidade Token" | Valida que token funciona após mudança de slug |
| TV | "Testar TV" | Valida TV screen, resolução, conteúdo |

### 11.3 O que cada teste valida

**Teste Multi-tenant (Edge Function: `run-qa-tests`):**
- Criação de empresas de teste (QA_A, QA_B)
- Cada empresa tem dados isolados
- Tokens são únicos e válidos
- Links públicos funcionam

**Teste RLS (Client-side):**
- Tenta SELECT em 8 tabelas de outra empresa
- Valida: products, customers, orders, banners, categories, deliverers, profiles, tv_screens
- Deve retornar vazio ou erro

**Teste Estabilidade Token (Edge Function: `test-token-stability`):**
- Pega token atual da empresa
- Altera slug temporariamente
- Verifica se token ainda resolve corretamente
- Restaura slug original

**Teste TV (Edge Function: `test-tv`):**
- Valida existência de TV screen
- Testa resolução por token
- Verifica se há conteúdo para exibir
- Valida company_id correto

### 11.4 Resultado dos Testes

Cada teste exibe:
- Total de verificações
- Quantidade passou (PASS)
- Quantidade falhou (FAIL)
- Detalhes de cada verificação
- Mensagens de erro quando aplicável

---

## 12. Padrões de UI/UX

### 12.1 Tema

Sistema de design baseado em **tokens CSS** com suporte a dark/light mode.

```css
/* Cores principais */
--primary: 221 83% 53%;      /* Azul principal */
--background: 220 20% 97%;   /* Fundo claro */
--foreground: 222 47% 11%;   /* Texto escuro */

/* Dark mode */
.dark {
  --background: 222 47% 6%;
  --foreground: 210 40% 98%;
}
```

### 12.2 Cores

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `primary` | Azul | Azul | Ações principais, destaques |
| `secondary` | Cinza claro | Cinza escuro | Elementos secundários |
| `destructive` | Vermelho | Vermelho escuro | Ações destrutivas |
| `muted` | Cinza | Cinza | Textos secundários |
| `success` | Verde | Verde | Confirmações |
| `warning` | Amarelo | Amarelo | Alertas |
| `info` | Azul claro | Azul claro | Informações |

### 12.3 Tipografia

| Família | Uso | Peso padrão |
|---------|-----|-------------|
| `Inter` | Corpo de texto | 400 (regular) |
| `Space Grotesk` | Headings | 500 (medium) |

### 12.4 Responsividade

**Breakpoints (Tailwind):**

| Breakpoint | Largura | Uso típico |
|------------|---------|------------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop pequeno |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Desktop grande |

### 12.5 Comportamento por Dispositivo

| Dispositivo | Considerações |
|-------------|---------------|
| **Mobile** | Menu em drawer, cards empilhados, touch-friendly |
| **Tablet** | Layout híbrido, sidebar recolhível |
| **Desktop** | Sidebar fixa, múltiplas colunas |
| **Totem** | Botões grandes, sem scroll horizontal |
| **TV** | Sem interação, texto grande, alto contraste |

### 12.6 Componentes UI

Baseados em Shadcn/UI:
- Button, Card, Dialog, Sheet
- Table, Form, Input, Select
- Toast, Sonner (notificações)
- Sidebar (navegação)

### 12.7 Animações

```css
/* Tokens de animação */
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Classes utilitárias */
.animate-fade-in    /* Fade in 0.5s */
.animate-slide-up   /* Slide up 0.5s */
.animate-slide-in-left /* Slide left 0.3s */
```

---

## 13. Pontos Fortes do Sistema

### 13.1 Diferenciais Competitivos

1. **Multi-canal unificado:** Um único cadastro de produtos serve delivery, QR code, totem e TV

2. **IA integrada:** Recomendações automáticas baseadas em dados reais do negócio

3. **Tokens seguros:** Links públicos não expõem estrutura interna, regeneráveis a qualquer momento

4. **RLS nativo:** Isolamento de dados garantido em nível de banco, não de aplicação

5. **Realtime:** Pedidos aparecem instantaneamente via Supabase Realtime

6. **Gamificação:** Roleta de prêmios para engajamento e fidelização

7. **Múltiplas TVs:** Cada TV pode ter seu próprio token e configuração

8. **Modo debug TV:** Facilita troubleshooting em campo

9. **QA automatizado:** Testes internos validam integridade do sistema

10. **Sugestões de venda IA:** Aumenta ticket médio com sugestões contextuais

11. **Impressão automática:** Integração com impressoras térmicas

12. **Som de notificação:** Alertas sonoros para novos pedidos

---

## 14. Pontos de Atenção

### 14.1 O que é Legado

| Item | Descrição | Status |
|------|-----------|--------|
| Rotas por slug | `/menu/:slug`, `/qrcode/:slug`, etc. | Mantido para compatibilidade |
| Tokens v1 | Colunas sem prefixo (`menu_token`, `qrcode_token`) | Migrar para v2 |
| Tabela `companies.menu_token` | Token na tabela principal | Usar `company_public_links` |
| Tabela `companies.totem_token` | Token na tabela principal | Usar `company_public_links` |

### 14.2 O que é Opcional

| Funcionalidade | Impacto se desabilitado |
|----------------|-------------------------|
| Som de notificação | Nenhum, preferência do usuário |
| Impressão automática | Operador imprime manualmente |
| IA Gestora | Sem recomendações automáticas |
| Roleta de prêmios | Sem gamificação |
| Múltiplas TVs | Apenas uma TV padrão |
| Sugestões no carrinho | Sem cross-sell automático |

### 14.3 O que Pode Evoluir

| Área | Possível evolução |
|------|-------------------|
| **Pagamento online** | Integração com gateways (Stripe, Pix API) |
| **Identificação por mesa** | QR code com número da mesa |
| **Push notifications** | Notificar cliente sobre status do pedido |
| **Dashboard analytics** | Gráficos e métricas avançadas |
| **Multi-idioma** | Suporte a inglês e espanhol |
| **Integração iFood** | Receber pedidos de marketplaces |
| **Estoque** | Controle de estoque por produto |
| **Cardápio com imagens** | Fotos dos produtos |
| **Cupons de desconto** | Sistema de cupons promocionais |
| **Programa de fidelidade** | Pontos e recompensas |
| **App mobile nativo** | React Native ou Flutter |
| **Relatórios exportáveis** | PDF/Excel de vendas |

---

## Apêndice A: Estrutura de Arquivos

```
src/
├── components/
│   ├── chat/            # AIChatWidget
│   ├── layout/          # DashboardLayout, AppSidebar
│   ├── menu/            # ProductCard, CartButton, CartSheet, SalesSuggestions
│   ├── orders/          # KanbanColumn, OrderCard, CashClosingDialog
│   ├── prizes/          # PrizeWheel
│   └── ui/              # Shadcn components
├── contexts/
│   ├── AuthContext.tsx  # Autenticação
│   └── CartContext.tsx  # Carrinho
├── hooks/
│   ├── useOrders.ts     # CRUD pedidos + realtime
│   ├── useProducts.ts   # CRUD produtos
│   ├── useCategories.ts
│   ├── useSubcategories.ts
│   ├── useCustomers.ts
│   ├── useDeliverers.ts
│   ├── useBanners.ts
│   ├── usePrizes.ts
│   ├── useCompany.ts
│   ├── useProfile.ts
│   ├── useAIRecommendations.ts
│   ├── useApplyRecommendation.ts
│   ├── useTVScreens.ts
│   ├── useCompanyPublicLinks.ts
│   ├── useRegenerateToken.ts
│   └── ...
├── pages/
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── Orders.tsx
│   ├── Products.tsx
│   ├── Categories.tsx
│   ├── Subcategories.tsx
│   ├── Customers.tsx
│   ├── Deliverers.tsx
│   ├── DelivererSettlement.tsx
│   ├── Banners.tsx
│   ├── TVScreens.tsx
│   ├── Prizes.tsx
│   ├── AIRecommendations.tsx
│   ├── MyLinks.tsx
│   ├── Company.tsx
│   ├── Users.tsx
│   ├── Settings.tsx
│   ├── QA.tsx
│   ├── PublicMenuByToken.tsx
│   ├── PublicQRCodeByToken.tsx
│   ├── PublicTotemByToken.tsx
│   ├── PublicTVByToken.tsx
│   ├── PublicRoletaByToken.tsx
│   ├── DeliveryMenu.tsx (legado)
│   ├── QRCodeMenu.tsx (legado)
│   ├── TotemMenu.tsx (legado)
│   ├── TVMenuPublic.tsx (legado)
│   ├── PrizeWheel.tsx (legado)
│   └── NotFound.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
└── utils/
    ├── printOrder.ts
    └── tokenValidation.ts

supabase/
├── functions/
│   ├── ai-chat/
│   ├── analyze-business/
│   ├── run-qa-tests/
│   ├── test-token-stability/
│   ├── test-tv/
│   └── send-whatsapp/
└── config.toml
```

---

## Apêndice B: Custom Hooks

| Hook | Descrição |
|------|-----------|
| `useProfile` | Perfil do usuário logado |
| `useCompany` | Dados da empresa |
| `useCompanyPublicLinks` | Links públicos da empresa |
| `useRegenerateToken` | Regenera token (admin only) |
| `useCategories` | CRUD categorias |
| `useSubcategories` | CRUD subcategorias |
| `useProducts` | CRUD produtos |
| `useOrders` | CRUD pedidos + realtime |
| `useCustomers` | CRUD clientes |
| `useDeliverers` | CRUD entregadores |
| `useBanners` | CRUD banners + upload |
| `usePrizes` | CRUD prêmios |
| `useTVScreens` | CRUD TV screens |
| `useCashClosing` | Fechamento de caixa |
| `useAIRecommendations` | Recomendações IA |
| `useApplyRecommendation` | Aplicar recomendação |
| `useOrderNotification` | Som de notificação |
| `useMenuByToken` | Cardápio por token |
| `useTVMenu` | Dados para TV |
| `useDeliveryMenu` | Cardápio delivery |
| `useQRCodeMenu` | Cardápio QR code |
| `useTotemMenu` | Cardápio totem |

---

## Apêndice C: Edge Functions

| Função | Endpoint | Descrição |
|--------|----------|-----------|
| `analyze-business` | POST | Analisa negócio e gera recomendações IA |
| `ai-chat` | POST | Chat conversacional com IA |
| `send-whatsapp` | POST | Envio de mensagens WhatsApp |
| `run-qa-tests` | POST | Executa testes multi-tenant |
| `test-token-stability` | POST | Testa estabilidade de tokens |
| `test-tv` | POST | Testa sistema de TV |

---

**Fim da Documentação**
