# Documentação Técnica - Sistema SaaS Multi-Tenant

**Data de Geração:** 2024-12-24  
**Versão:** 1.0  
**Propósito:** Auditoria de Arquitetura

---

## 1. Visão Geral da Arquitetura

### 1.1 Modelo SaaS Multi-Tenant

O sistema é um SaaS multi-tenant para gestão de restaurantes, onde cada empresa (tenant) possui dados isolados através do campo `company_id`.

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Dashboard   │  │ Cardápio    │  │ IA Gestora          │  │
│  │ Pedidos     │  │ Produtos    │  │ Assistente IA       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE (Backend)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Edge Functions  │  │ PostgreSQL + RLS│  │ Storage      │ │
│  │ - ai-manager    │  │ - companies     │  │ - banners    │ │
│  │ - ai-assistant  │  │ - products      │  │              │ │
│  │ - ai-tts        │  │ - orders        │  │              │ │
│  │ - ai-chat       │  │ - ai_*          │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Isolamento por company_id

Todas as tabelas principais possuem a coluna `company_id` como chave estrangeira para a tabela `companies`:

| Tabela | Isolamento |
|--------|------------|
| `products` | `company_id` NOT NULL |
| `orders` | `company_id` NOT NULL |
| `order_items` | via `orders.company_id` |
| `categories` | `company_id` NOT NULL |
| `subcategories` | `company_id` NOT NULL |
| `banners` | `company_id` NOT NULL |
| `ai_recommendations` | `company_id` NOT NULL |
| `ai_insight_runs` | `company_id` NOT NULL |
| `ai_chat_messages` | `company_id` NOT NULL |

### 1.3 Row Level Security (RLS)

O RLS é habilitado em todas as tabelas de negócio. As políticas garantem que:

1. **Usuários autenticados** só acessam dados da sua `company_id`
2. **Funções database** (`get_user_company_id`) retornam a empresa do usuário logado
3. **Service Role Key** é usada apenas em Edge Functions para operações administrativas

```sql
-- Exemplo de função de contexto
CREATE FUNCTION public.get_user_company_id(_user_id uuid) RETURNS uuid
AS $$ SELECT company_id FROM public.profiles WHERE id = _user_id $$
```

---

## 2. Estrutura de IA

### 2.1 Arquitetura de IAs

O sistema possui **4 módulos de IA distintos**:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MÓDULOS DE IA                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ IA GESTORA   │  │ IA ASSISTENTE│  │ IA TV        │  │ IA TTS    │ │
│  │ (ai-manager) │  │ (ai-assistant│  │ (ai-tv-      │  │ (ai-tts)  │ │
│  │              │  │              │  │  scheduler)  │  │           │ │
│  │ - Análise de │  │ - Multimodal │  │ - Qual prod. │  │ - OpenAI  │ │
│  │   vendas     │  │ - Texto/Img  │  │ - Qual hora  │  │ - Eleven  │ │
│  │ - Sugestões  │  │ - Áudio/PDF  │  │ - Por quanto │  │   Labs    │ │
│  │ - Explicável │  │ - Contextual │  │   tempo      │  │ - Fallbck │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 IA Gestora (`ai-manager`)

**Propósito:** Análise de vendas e cardápio com sugestões explicáveis.

**Edge Function:** `supabase/functions/ai-manager/index.ts`

**Modelo de IA:** Configurável via UI (Self-Hosted)

**Funcionalidades:**
- Análise de vendas dos últimos 30/60/90 dias
- Identificação de produtos campeões e baixa venda
- Sugestões de combos baseadas em pareamento de produtos
- Recomendações de destaques para TV
- Sugestões de remoção de produtos sem venda

**Formato de Saída (JSON estruturado):**

```json
{
  "recommendations": [
    {
      "type": "menu | price | combo | promo | remove | tv",
      "title": "string",
      "explanation": {
        "why": "motivo baseado em dados + perfil da loja",
        "risk_if_ignored": "risco de não implementar",
        "expected_impact": {
          "sales": "increase | neutral | decrease",
          "operation": "simplify | neutral | complex",
          "confidence": "low | medium | high"
        }
      },
      "suggested_action": { "action": "string", "details": {} },
      "priority": 1-5
    }
  ]
}
```

### 2.3 IA Explicável (XAI)

Toda recomendação da IA Gestora contém **3 dimensões de explicabilidade**:

| Campo | Descrição |
|-------|-----------|
| `why` | Justificativa baseada em dados concretos + menção ao perfil da loja |
| `risk_if_ignored` | Consequência de não implementar a sugestão |
| `expected_impact` | Impacto esperado em vendas, operação e nível de confiança |

### 2.4 Perfil de Comportamento da Loja

A tabela `companies` possui o campo `store_profile` (ENUM):

| Perfil | Comportamento |
|--------|---------------|
| `conservative` | Sem remoções, descontos mínimos, foco em melhorias incrementais |
| `balanced` | Remoções após 45+ dias sem venda, descontos até 15% |
| `aggressive` | Remoções após 30 dias, descontos até 25%, ações de alto impacto |

**Regras específicas por perfil são injetadas no system prompt:**

```typescript
const getProfileRules = (profile: StoreProfile): string => {
  // Retorna regras específicas baseadas no perfil
};
```

### 2.5 IA de Programação de TV (`ai-tv-scheduler`)

**Propósito:** Gerar programação inteligente de produtos para exibição na TV do restaurante.

**Edge Function:** `supabase/functions/ai-tv-scheduler/index.ts`

**Modelo de IA:** Configurável via UI (Self-Hosted)

**Decisões Autônomas:**
- **Qual produto aparece:** Baseado em vendas, margem e necessidade de destaque
- **Em qual horário:** Considera contexto do horário (manhã, almoço, tarde, jantar)
- **Por quanto tempo:** Produtos campeões (8-10s), promoções (12-15s), normais (10s)

**Regras de Programação:**
```
┌─────────────┬──────────────────────────────────────────┐
│ Horário     │ Estratégia                               │
├─────────────┼──────────────────────────────────────────┤
│ 06:00-11:00 │ Café da manhã, lanches leves             │
│ 11:00-14:00 │ Pratos principais, combos (PICO)         │
│ 14:00-18:00 │ Sobremesas, lanches                      │
│ 18:00-22:00 │ Pratos principais, combos família (PICO) │
│ 22:00-06:00 │ Lanches rápidos                          │
└─────────────┴──────────────────────────────────────────┘
```

**Schema: tv_schedules**
```sql
CREATE TABLE tv_schedules (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  product_id UUID NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  duration_seconds INTEGER DEFAULT 10,
  priority INTEGER DEFAULT 1,
  generated_by_ai BOOLEAN DEFAULT true,
  ai_reason TEXT,
  active BOOLEAN DEFAULT true
);
```

### 2.6 Limites de Interferência da IA

**Regras Globais (aplicam-se a TODOS os perfis):**

| Regra | Limite |
|-------|--------|
| Remoções de produto por semana | Máximo 1 |
| Alterações de preço por semana | Máximo 3 |
| Produtos novos (< 14 dias) | Nunca interferir |
| Operação sobrecarregada | Não sugerir promoções |

**Detecção de sobrecarga operacional:**
```typescript
const isOperationOverloaded = ordersInLastHour.length > 10;
```

---

## 3. Assistente Multimodal

### 3.1 Tipos de Entrada Suportados

| Tipo | Formato | Processamento |
|------|---------|---------------|
| **Texto** | String | Direto para o modelo |
| **Áudio** | Base64 (webm) | Transcrição via Whisper → Texto |
| **Imagem** | Base64 + mimeType | GPT-4 Vision (análise visual) |
| **PDF** | Base64 | Primeiros 5000 chars como contexto |

### 3.2 Fluxo Técnico

```
┌──────────┐    ┌─────────────────┐    ┌─────────────────┐
│  UPLOAD  │───▶│ PRÉ-PROCESSAMENTO│───▶│ EXTRAÇÃO       │
│          │    │ (FileReader)     │    │                │
└──────────┘    └─────────────────┘    │ - Áudio → STT  │
                                       │ - Imagem → b64 │
                                       │ - PDF → texto  │
                                       └────────┬────────┘
                                                │
                                                ▼
┌──────────────────┐    ┌─────────────────────────────────┐
│  RESPOSTA        │◀───│ CHAMADA AO MODELO               │
│  JSON estruturada│    │ OpenAI GPT-4o / GPT-4o-mini     │
└──────────────────┘    │ + Contexto da empresa           │
                        └─────────────────────────────────┘
```

**Edge Function:** `supabase/functions/ai-assistant/index.ts`

**Modelos utilizados:**
- `gpt-4o`: Quando há imagem (Vision)
- `gpt-4o-mini`: Para texto/áudio/PDF

### 3.3 Contexto Injetado

O assistente recebe automaticamente:

```typescript
const businessContext = {
  empresa: company.name,
  perfil: company.store_profile,
  produtos_ativos: productList.length,
  pedidos_30_dias: totalOrders,
  faturamento_30_dias: totalRevenue,
  ticket_medio: avgTicket,
  top_5_produtos: topSellers,
};
```

### 3.4 Persistência de Mensagens

**Status atual:** As mensagens do assistente **NÃO são persistidas** no banco de dados durante a sessão atual.

**Tabela existente (não utilizada):**
```sql
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Observação:** A tabela existe mas não está sendo populada pela implementação atual do assistente.

---

## 4. Arquitetura de Áudio (TTS)

### 4.1 Arquitetura Desacoplada

O sistema TTS utiliza o padrão **Provider Pattern** para desacoplamento:

```typescript
interface TTSProvider {
  name: string;
  generateAudio(text: string, voice?: string): Promise<TTSResult>;
}
```

### 4.2 Providers Implementados

| Provider | Classe | API Key | Prioridade |
|----------|--------|---------|------------|
| OpenAI TTS | `OpenAITTSProvider` | `OPENAI_API_KEY` | Default |
| ElevenLabs | `ElevenLabsTTSProvider` | `ELEVENLABS_API_KEY` | Fallback |

### 4.3 Factory Pattern

```typescript
function createTTSProvider(preferredProvider?: string): TTSProvider | null {
  // 1. Se usuário pediu ElevenLabs E key existe → ElevenLabs
  // 2. Se OpenAI key existe → OpenAI (default)
  // 3. Se ElevenLabs key existe → ElevenLabs (fallback)
  // 4. Nenhum → null
}
```

### 4.4 Fallback para Texto

Quando **todos os providers falham**, o sistema retorna:

```json
{
  "error": "TTS generation failed",
  "fallback": true,
  "text_only": true,
  "original_text": "texto original"
}
```

O frontend trata este caso exibindo apenas texto, sem áudio.

### 4.5 Armazenamento de Chaves

| Secret | Localização | Escopo |
|--------|-------------|--------|
| `OPENAI_API_KEY` | Supabase Secrets | Edge Functions |
| `ELEVENLABS_API_KEY` | Supabase Secrets | Edge Functions |

**As chaves NUNCA são expostas ao frontend.**

---

## 5. Fluxo de Mensagens da IA

### 5.1 Tabelas Utilizadas

| Tabela | Propósito |
|--------|-----------|
| `ai_recommendations` | Armazena sugestões da IA Gestora |
| `ai_insight_runs` | Registra execuções de análise |
| `ai_chat_messages` | Mensagens de chat do Assistente IA |
| `ai_jobs` | Controle de jobs de IA (status, custo, erros) |

### 5.2 Schema: ai_recommendations

```sql
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_payload_json JSONB,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Ciclo de vida e rastreamento de impacto
  applied_at TIMESTAMPTZ,           -- Quando o admin aplicou
  evaluated_at TIMESTAMPTZ,         -- Quando o sistema avaliou
  impact_result JSONB               -- Resultado do impacto
);
```

**Status possíveis:**
- `new`: Sugestão pendente
- `applied`: Sugestão aplicada (com `applied_at` preenchido)
- `dismissed`: Sugestão ignorada

**Ciclo de Vida da Recomendação:**
```
IA sugere → Admin aplica → Sistema avalia → Impacto registrado
   ↓            ↓               ↓                  ↓
 status:     status:        evaluated_at       impact_result
  'new'     'applied'       preenchido         preenchido
            applied_at
```

**Estrutura do impact_result:**
```json
{
  "before": { "avg_sales": 120 },
  "after": { "avg_sales": 145 },
  "delta": "+20.8%"
}

### 5.3 Schema: ai_insight_runs

```sql
CREATE TABLE ai_insight_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  triggered_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.4 Schema: ai_chat_messages

```sql
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL, -- texto final (nunca arquivos brutos)
  input_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'audio' | 'image' | 'pdf'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Fluxo de Persistência:**
1. Usuário envia áudio/imagem/PDF → Edge Function extrai texto
2. Salva apenas o texto extraído + metadado `input_type`
3. Resposta do assistente também é salva com `role: 'assistant'`

### 5.5 Schema: ai_jobs

```sql
CREATE TABLE ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  type TEXT NOT NULL CHECK (type IN ('manager', 'assistant', 'tts')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error')),
  input_hash TEXT,
  cost_estimate NUMERIC DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Status do Job:**
- `pending`: Job aguardando processamento
- `running`: Job em execução
- `done`: Job concluído com sucesso
- `error`: Job falhou (erro em `error_message`)

### 5.6 Controle de Erros

| Cenário | HTTP Status | Tratamento |
|---------|-------------|------------|
| Rate limit provedor IA | 429 | Mensagem "Tente novamente em alguns minutos" |
| Créditos insuficientes | 402 | Mensagem "Créditos esgotados" |
| Erro de parsing JSON | 500 | Log + fallback para texto puro |
| Provider TTS falha | 500 | Tenta fallback, depois retorna text_only |
| **Erros são persistidos** | N/A | Campo `error_message` na tabela `ai_jobs` |

### 5.7 Auditoria

**Implementada:**
- `ai_insight_runs`: Registra cada execução com `triggered_by_user_id`
- `ai_jobs`: Registra todos os jobs de IA com status e custos estimados
- `ai_chat_messages`: Persiste histórico de conversas por sessão
- `token_audit_logs`: Registra regeneração de tokens públicos

**Métricas Disponíveis:**
- Quantidade de jobs por tipo (`manager`, `assistant`, `tts`)
- Taxa de erros por tipo de job
- Custo estimado por empresa

---

## 6. Custo e Controle

### 6.1 Redução de Tokens

| Componente | Estratégia |
|------------|------------|
| IA Gestora | Limita a 5 recomendações por análise |
| IA Gestora | Contexto limitado a produtos/pedidos relevantes |
| Assistente | Cardápio limitado a 20 produtos no prompt |
| Assistente | PDFs truncados a 5000 caracteres |
| TTS OpenAI | Texto limitado a 4096 caracteres |
| TTS ElevenLabs | Texto limitado a 5000 caracteres |

### 6.2 Limites por Resposta

| Módulo | Limite |
|--------|--------|
| IA Gestora | Máx 5 recomendações |
| Assistente | Máx 3 suggested_actions |
| Assistente | max_tokens: 2000 |
| TTS | Único áudio por solicitação |

### 6.3 Regras de Proteção

1. **Arquivos brutos nunca vão ao modelo:**
   - Imagens: Convertidas para base64 inline
   - PDFs: Truncados para texto
   - Áudios: Transcritos via Whisper antes

2. **Contexto é pré-processado:**
   - Dados agregados (não raw data)
   - Apenas últimos 30 dias (ou 90 para comparação)
   - Produtos filtrados por `company_id`

---

## 7. UI do Assistente

### 7.1 Localização no Sistema

O assistente está disponível na página **IA Gestora** (`/ai-recommendations`):

```
Dashboard
├── IA Gestora ← Botão "Assistente IA" toggle
│   ├── [Recomendações]
│   └── [Assistente IA Chat] ← Alternável
```

**Componente:** `src/components/ai-assistant/AIAssistantChat.tsx`

### 7.2 Envio de Arquivos

| Ação | Componente | Limite |
|------|------------|--------|
| Imagem/PDF | `<input type="file" accept="image/*,application/pdf">` | 10MB |
| Áudio | `MediaRecorder` (WebM) | Tempo de gravação ilimitado |

**Fluxo de upload:**
```
FileReader.readAsDataURL() → base64 → Edge Function → OpenAI
```

### 7.3 Reprodução de Áudio (TTS)

| Elemento | Comportamento |
|----------|---------------|
| Botão "Ouvir" | Aparece em toda mensagem do assistente |
| Loading | Spinner durante geração |
| Playing | Ícone muda para "Parar" |
| Stop | Para áudio e reseta estado |

**Hook:** `src/hooks/useTTS.ts`

```typescript
const tts = useTTS({
  onError: () => toast.error('Erro ao gerar áudio'),
});
await tts.generateAndPlay(text);
```

---

## 8. Segurança

### 8.1 Isolamento por company_id

**Garantias implementadas:**

| Camada | Mecanismo |
|--------|-----------|
| Database | RLS policies em todas as tabelas |
| Edge Functions | Filtro explícito por `company_id` |
| Frontend | `useProfile()` retorna apenas dados do usuário logado |

**Exemplo de query isolada:**
```typescript
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('company_id', companyId) // Sempre filtrado
  .eq('active', true);
```

### 8.2 Proteção de Anexos

| Risco | Mitigação |
|-------|-----------|
| Anexo de outra empresa | `company_id` é parâmetro obrigatório |
| Anexo público | Storage bucket `banners` é público, mas controlado |
| Vazamento de dados | Anexos processados em memória, não persistidos |

### 8.3 Restrições de Acesso

| Recurso | Restrição |
|---------|-----------|
| IA Gestora | Apenas usuários autenticados |
| Assistente IA | Apenas usuários autenticados |
| Edge Functions TTS | Público (`verify_jwt = false`) |
| Edge Functions ai-manager | Autenticado (`verify_jwt = true`) |

### 8.4 Chaves de API

| Chave | Armazenamento | Acesso |
|-------|---------------|--------|
| `API Key do Provedor` | ai_provider_config (BD) | Configurado via UI |
| `OPENAI_API_KEY` | Supabase Secrets | Manual pelo admin (TTS) |
| `ELEVENLABS_API_KEY` | Supabase Secrets | Manual pelo admin (TTS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secrets | Sistema |

**Nenhuma chave é exposta ao cliente.**

---

## 9. Edge Functions Implementadas

| Função | JWT | Propósito |
|--------|-----|-----------|
| `ai-manager` | ✓ | IA Gestora Explicável |
| `ai-assistant` | ✗ | Assistente Multimodal |
| `ai-tts` | ✗ | Text-to-Speech desacoplado |
| `ai-chat` | ✗ | Chat genérico (não usado pelo assistente) |
| `send-whatsapp` | ✗ | Envio de notificações |
| `analyze-business` | ✓ | Análise de negócio |
| `run-qa-tests` | ✓ | Testes de QA |
| `test-token-stability` | ✓ | Validação de tokens |
| `test-tv` | ✓ | Testes de TV |

---

## 10. Diagrama de Dependências

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                                                              │
│  AIRecommendations.tsx ──────────┬──────────────────────────│
│         │                        │                           │
│         ▼                        ▼                           │
│  AIAssistantChat.tsx        useAIRecommendations.ts         │
│         │                        │                           │
│         │                        ▼                           │
│         │                  useApplyRecommendation.ts        │
│         │                                                    │
│         ▼                                                    │
│     useTTS.ts                                               │
│                                                              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTIONS                          │
│                                                              │
│  ai-manager ─────────────▶ Self-Hosted AI Provider           │
│       │                    (Configurável via UI)             │
│       │                                                      │
│       ▼                                                      │
│  ai_recommendations ──────▶ PostgreSQL                      │
│                                                              │
│  ai-assistant ───────────▶ OpenAI GPT-4o                    │
│       │                    OpenAI Whisper (STT)             │
│       │                                                      │
│       ▼                                                      │
│  Resposta JSON                                              │
│                                                              │
│  ai-tts ─────────────────▶ OpenAI TTS / ElevenLabs          │
│       │                                                      │
│       ▼                                                      │
│  Base64 Audio                                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Resumo de Conformidade

| Requisito | Status |
|-----------|--------|
| Multi-tenant com isolamento | ✅ Implementado |
| RLS em todas as tabelas | ✅ Implementado |
| IA Explicável (XAI) | ✅ Implementado |
| Perfis de loja | ✅ Implementado |
| Limites de interferência | ✅ Implementado |
| Assistente Multimodal | ✅ Implementado |
| TTS desacoplado | ✅ Implementado |
| Fallback para texto | ✅ Implementado |
| Chaves protegidas | ✅ Implementado |
| Persistência de chat | ⚠️ Estrutura existe, não utilizada |
| Auditoria completa | ⚠️ Parcial (runs e tokens) |
| Métricas de custo | ❌ Não implementado |

---

*Documento gerado automaticamente para fins de auditoria de arquitetura.*
