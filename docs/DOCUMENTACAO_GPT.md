# Zoopi - Documentação Completa do Sistema

## Visão Geral

O **Zoopi** é uma plataforma SaaS completa para gestão de estabelecimentos comerciais (restaurantes, lanchonetes, pizzarias, etc.), oferecendo funcionalidades de cardápio digital, gestão de pedidos, campanhas de marketing, TV menu, totem de autoatendimento e recursos de IA.

---

## Arquitetura Técnica

### Stack Frontend
- **React 18** com TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilização
- **Shadcn/UI** para componentes
- **TanStack Query** para gerenciamento de estado/cache
- **React Router DOM** para roteamento

### Stack Backend (Lovable Cloud/Supabase)
- **PostgreSQL** como banco de dados
- **Edge Functions** (Deno) para lógica serverless
- **Row Level Security (RLS)** para segurança de dados
- **Storage** para arquivos (logos, banners)
- **Realtime** para atualizações em tempo real

---

## Estrutura de Dados

### Tabelas Principais

#### 1. `companies` - Empresas/Estabelecimentos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| name | text | Nome da empresa |
| slug | text | URL amigável (único) |
| address | text | Endereço |
| phone | text | Telefone |
| whatsapp | text | WhatsApp |
| logo_url | text | URL do logo |
| primary_color | text | Cor primária (hex) |
| secondary_color | text | Cor secundária (hex) |
| background_color | text | Cor de fundo (hex) |
| is_active | boolean | Se está ativa |
| is_template | boolean | Se é template para clonagem |
| trial_ends_at | timestamp | Fim do período trial |
| store_profile | enum | Perfil: balanced, economic, premium |
| opening_hours | jsonb | Horários de funcionamento |
| order_sound_enabled | boolean | Som ao receber pedido |
| auto_print_enabled | boolean | Impressão automática |
| menu_token | text | Token legado do cardápio |
| totem_token | text | Token legado do totem |

#### 2. `profiles` - Perfis de Usuários
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | ID do usuário (auth.users) |
| company_id | uuid | Empresa vinculada |
| full_name | text | Nome completo |
| email | text | E-mail |
| avatar_url | text | URL do avatar |

#### 3. `user_roles` - Papéis de Usuários
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| user_id | uuid | ID do usuário |
| role | app_role | admin ou employee |

#### 4. `categories` - Categorias do Cardápio
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| company_id | uuid | Empresa |
| name | text | Nome da categoria |
| active | boolean | Se está ativa |

#### 5. `subcategories` - Subcategorias
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| company_id | uuid | Empresa |
| category_id | uuid | Categoria pai |
| name | text | Nome |
| active | boolean | Se está ativa |

#### 6. `products` - Produtos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| company_id | uuid | Empresa |
| subcategory_id | uuid | Subcategoria |
| name | text | Nome do produto |
| price | numeric | Preço |
| active | boolean | Se está ativo |
| aparece_delivery | boolean | Mostrar no delivery |
| aparece_qrcode | boolean | Mostrar no QR Code |
| aparece_totem | boolean | Mostrar no totem |
| aparece_tv | boolean | Mostrar na TV |
| aparece_tablet | boolean | Mostrar no tablet |
| destaque_horario | text[] | Horários de destaque |
| ordem_destaque | integer | Ordem de destaque |

#### 7. `orders` - Pedidos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| company_id | uuid | Empresa |
| customer_id | uuid | Cliente (opcional) |
| customer_name | text | Nome do cliente |
| customer_phone | text | Telefone |
| customer_address | text | Endereço |
| order_type | text | delivery, balcao, mesa |
| status | order_status | novo, preparando, pronto, entregue, cancelado |
| total | numeric | Valor total |
| payment_method | text | Forma de pagamento |
| notes | text | Observações |
| deliverer_id | uuid | Entregador |

#### 8. `order_items` - Itens do Pedido
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| order_id | uuid | Pedido |
| product_id | uuid | Produto |
| product_name | text | Nome do produto |
| quantity | integer | Quantidade |
| unit_price | numeric | Preço unitário |
| notes | text | Observações |

#### 9. `customers` - Clientes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| company_id | uuid | Empresa |
| name | text | Nome |
| whatsapp | text | WhatsApp |
| alerts | text | Alertas/observações |

#### 10. `deliverers` - Entregadores
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| company_id | uuid | Empresa |
| name | text | Nome |
| whatsapp | text | WhatsApp |
| active | boolean | Se está ativo |

---

## Sistema de Tokens Públicos

A tabela `company_public_links` gerencia os tokens de acesso público:

| Token | Prefixo | Uso |
|-------|---------|-----|
| menu_token_v2 | m_ | Cardápio digital |
| qrcode_token_v2 | q_ | QR Code do cardápio |
| totem_token_v2 | t_ | Totem de autoatendimento |
| tv_token_v2 | tv_ | TV Menu |
| roleta_token_v2 | r_ | Roleta de prêmios |

### URLs Públicas
- `/m/{token}` - Cardápio digital
- `/q/{token}` - QR Code menu
- `/t/{token}` - Totem
- `/tv/{token}` - TV Menu
- `/r/{token}` - Roleta de prêmios

---

## Sistema de Campanhas e Marketing

### Tabelas

#### `campaigns` - Campanhas
- Tipos: reengajamento, promocional, novidade
- Status: pending, scheduled, running, completed, cancelled
- Canais: whatsapp
- Regras de audiência: inactive_30d, all_customers, top_customers

#### `campaign_messages` - Mensagens Enviadas
- Rastreamento de envio, entrega e leitura
- Status: pending, sent, delivered, read, failed

#### `campaign_settings` - Configurações
- Janela de envio (horários permitidos)
- Limite de mensagens por cliente
- Integração WhatsApp (ZAPI, etc.)

#### `campaign_opt_outs` - Descadastros
- Clientes que optaram por não receber mensagens

---

## Sistema de IA

### Funcionalidades

1. **AI Chat** - Assistente conversacional para clientes
2. **AI Manager (Gestora)** - Análise de dados e recomendações
3. **AI Menu Creative** - Sugestões de melhorias no cardápio
4. **AI Repurchase** - Previsão de recompra
5. **AI TV Scheduler** - Programação inteligente da TV
6. **AI TTS** - Text-to-Speech para anúncios

### Tabelas de IA

#### `ai_recommendations` - Recomendações
- action_type: update_price, create_campaign, highlight_product, etc.
- status: new, applied, ignored

#### `ai_confidence_scores` - Pontuação de Confiança
- Rastreamento de sucesso das recomendações
- Score adaptativo baseado em resultados

#### `ai_jobs` - Jobs de Processamento
- Fila de processamento assíncrono
- Controle de custos e limites

#### `company_ai_settings` - Configurações de IA
- Limites diários de chat e análise
- Providers (OpenAI, Lovable)

---

## Sistema de Assinaturas (SaaS)

### Tabelas

#### `plans` - Planos
| Campo | Descrição |
|-------|-----------|
| name | Nome do plano |
| slug | Identificador único |
| price_cents | Preço em centavos |
| billing_period | monthly, yearly |
| features_json | Lista de features |
| limits_json | Limites (produtos, usuários, etc.) |

#### `subscriptions` - Assinaturas
| Campo | Descrição |
|-------|-----------|
| company_id | Empresa assinante |
| plan_id | Plano contratado |
| status | active, trial, past_due, canceled |
| current_period_start/end | Período atual |
| grace_until | Prazo de carência |
| provider | mercadopago, asaas, manual |

#### `invoices` - Faturas
- Controle de pagamentos
- Status: pending, paid, failed

#### `saas_admins` - Administradores SaaS
- Usuários com acesso ao painel administrativo

#### `saas_audit_logs` - Logs de Auditoria
- Rastreamento de ações administrativas

---

## Segurança (RLS)

### Funções de Segurança

```sql
-- Verifica se usuário é admin SaaS
is_saas_admin(user_uuid uuid) → boolean

-- Obtém company_id do usuário
get_user_company_id(user_id uuid) → uuid

-- Verifica papel do usuário
has_role(user_id uuid, role app_role) → boolean

-- Verifica acesso da empresa
check_company_access(company_uuid uuid) → jsonb
```

### Padrões de RLS

1. **Isolamento por Empresa**: Usuários só veem dados da própria empresa
2. **Controle por Papel**: Admins têm mais permissões que employees
3. **Acesso Público**: Algumas tabelas permitem leitura pública (produtos ativos, etc.)
4. **Acesso de Sistema**: Edge functions usam service_role para operações especiais

---

## Edge Functions

### Funções Disponíveis

| Função | Descrição |
|--------|-----------|
| ai-assistant | Assistente de IA para gestores |
| ai-chat | Chat com clientes |
| ai-campaigns | Geração de campanhas |
| ai-manager | Análise de negócios |
| ai-menu-creative | Sugestões de cardápio |
| ai-menu-highlight | Destaques inteligentes |
| ai-repurchase | Previsão de recompra |
| ai-tts | Text-to-Speech |
| ai-tv-highlight | Destaques para TV |
| ai-tv-scheduler | Programação de TV |
| analyze-business | Análise geral do negócio |
| clone-company-menu | Clonagem de cardápio |
| send-whatsapp | Envio de WhatsApp |
| webhook-asaas | Webhook do Asaas |
| webhook-mercadopago | Webhook do MercadoPago |

---

## Fluxos Principais

### 1. Criação de Empresa
1. Usuário se cadastra (auth)
2. Profile é criado automaticamente (trigger)
3. Usuário cria empresa (rpc: create_company_for_user)
4. Profile é atualizado com company_id
5. user_roles recebe role 'admin'
6. company_public_links é criada (trigger)

### 2. Recebimento de Pedido
1. Cliente acessa cardápio público (token)
2. Adiciona itens ao carrinho
3. Submete pedido (insert orders + order_items)
4. Dashboard recebe via realtime
5. Som de notificação (se habilitado)
6. Impressão automática (se habilitado)

### 3. Campanha de Reengajamento
1. Sistema identifica clientes inativos
2. AI gera mensagem personalizada
3. Campanha é criada com status 'pending'
4. Admin aprova/agenda
5. Mensagens são enviadas via WhatsApp
6. Status é rastreado (sent, delivered, read)

---

## Integrações

### WhatsApp (ZAPI)
- Envio de mensagens
- Templates de campanha
- Rastreamento de entrega

### Pagamentos
- **MercadoPago**: Webhook para PIX/Cartão
- **Asaas**: Webhook para boleto/PIX

### Analytics/Marketing
- Google Analytics 4 (GA4)
- Google Tag Manager (GTM)
- Meta Pixel (Facebook)

---

## Enums do Sistema

```sql
-- Status do pedido
CREATE TYPE order_status AS ENUM (
  'novo', 'preparando', 'pronto', 'entregue', 'cancelado'
);

-- Papel do usuário
CREATE TYPE app_role AS ENUM ('admin', 'employee');

-- Perfil da loja
CREATE TYPE store_profile AS ENUM ('balanced', 'economic', 'premium');
```

---

## Configurações por Empresa

### company_ai_settings
- chat_enabled, chat_provider
- tts_enabled, tts_provider
- daily_chat_limit, daily_analysis_limit

### company_integrations
- whatsapp_enabled, whatsapp_provider
- pix_enabled, pix_provider, pix_key

### company_marketing_settings
- enable_ga4, ga4_measurement_id
- enable_gtm, gtm_container_id
- enable_meta_pixel, meta_pixel_id
- instagram_url, facebook_page_url

---

## Rotas da Aplicação

### Públicas (sem autenticação)
- `/auth` - Login/Cadastro
- `/m/:token` - Cardápio público
- `/q/:token` - QR Code menu
- `/t/:token` - Totem
- `/tv/:token` - TV Menu
- `/r/:token` - Roleta

### Protegidas (requer autenticação)
- `/` - Dashboard
- `/orders` - Pedidos (Kanban)
- `/products` - Produtos
- `/categories` - Categorias
- `/subcategories` - Subcategorias
- `/customers` - Clientes
- `/deliverers` - Entregadores
- `/campaigns` - Campanhas
- `/repurchase` - Recompra
- `/banners` - Banners
- `/prizes` - Prêmios
- `/tv-screens` - Telas de TV
- `/my-links` - Links públicos
- `/users` - Usuários
- `/company` - Dados da empresa
- `/settings/*` - Configurações

### SaaS Admin (requer is_saas_admin)
- `/saas` - Dashboard SaaS
- `/saas/companies` - Empresas
- `/saas/plans` - Planos
- `/saas/subscriptions` - Assinaturas
- `/saas/templates` - Templates
- `/saas/audit` - Auditoria

---

## Limites por Plano (exemplo)

```json
{
  "products": 50,
  "tv_screens": 1,
  "users": 2,
  "ai_runs_month": 50,
  "campaigns_month": 20
}
```

---

## Status da Aplicação

✅ **Funcionando:**
- Autenticação e autorização
- Gestão de empresas
- Cardápio digital
- Pedidos
- Campanhas
- Sistema de assinaturas
- Painel SaaS
- Edge Functions de IA
- Tokens públicos v2
- RLS em todas as tabelas

⚠️ **Avisos Menores:**
- Leaked Password Protection desabilitado (configuração de auth)

---

## Contato e Suporte

Para dúvidas técnicas sobre a implementação, consulte:
- Código fonte no repositório
- Logs do sistema (Supabase Analytics)
- Edge Function logs
