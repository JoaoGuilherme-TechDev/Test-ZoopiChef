# AUDITORIA COMPLETA DOS MÓDULOS DE IA

**Data:** 2024-12-26
**Status:** Validação técnica completa

---

## MATRIZ DE EXECUÇÃO (PASS/FAIL)

| Módulo | Endpoint | JWT? | Input Types | Output Schema | company_id | Tabelas DB | ai_jobs? | Frontend? | Status |
|--------|----------|------|-------------|---------------|------------|------------|----------|-----------|--------|
| **ai-manager** | `POST /ai-manager` | Não | `{ company_id, user_id, analysis_type }` | `{ success, recommendations_count, message }` | Sim (body) | `ai_recommendations`, `ai_insight_runs` | Não (usa `ai_insight_runs`) | Sim (`useAIRecommendations`) | **PASS** |
| **ai-assistant** | `POST /ai-assistant` | Não | `{ message, companyId, sessionId, imageBase64?, pdfBase64? }` | `{ text_response, analysis }` | Sim (body) | `ai_jobs`, `ai_chat_messages` | **SIM** | Sim (`AIAssistantChat`) | **PASS** |
| **ai-menu-creative** | `POST /ai-menu-creative` | Não | `{ company_id, focus_type? }` | `{ suggestions: MenuSuggestion[] }` | Sim (body) | Nenhuma (só retorna) | **NÃO** | **NÃO CONECTADO** | **FAIL** |
| **ai-repurchase** | `POST /ai-repurchase` | Não | `{ company_id, action, days_threshold }` | `{ suggestions, message }` | Sim (body) | `repurchase_suggestions`, `campaign_messages` | **NÃO** | Sim (`useRepurchase`) | **PASS** |
| **ai-tv-scheduler** | `POST /ai-tv-scheduler` | Não | `{ companyId }` | `{ success, schedules }` | Sim (body) | `ai_jobs`, `tv_schedules` | **SIM** | **NÃO CONECTADO** | **FAIL** |
| **ai-tv-highlight** | `POST /ai-tv-highlight` | Não | `{ companyId }` | `{ success, suggestions_count, time_highlights }` | Sim (body) | `ai_jobs`, `time_highlight_suggestions` | **SIM** | Sim (`useTimeHighlights`) | **PASS** |
| **ai-campaigns** | `POST /ai-campaigns` | Não | `{ company_id, action }` | `{ campaigns, message }` | Sim (body) | `campaigns`, `campaign_settings`, `campaign_messages` | **NÃO** | Sim (`useCampaigns`) | **PASS** |
| **ai-tts** | `POST /ai-tts` | Não | `{ text, voice?, provider? }` | `{ audioBase64, mimeType, provider }` | **NÃO** | Nenhuma | **NÃO** | Sim (`useTTS`) | **PASS** |
| **ai-menu-highlight** | `POST /ai-menu-highlight` | Não | `{ companyId, channels? }` | `{ success, suggestions_count, highlights }` | Sim (body) | `ai_jobs`, `time_highlight_suggestions` | **SIM** | Sim (`useTimeHighlights`) | **PASS** |
| **analyze-business** | `POST /analyze-business` | Não | `{ company_id, user_id }` | `{ success, recommendations, message }` | Sim (body) | `ai_insight_runs`, `ai_recommendations` | Não (usa insight_runs) | **NÃO CONECTADO** | **FAIL** |

---

## DETALHAMENTO POR MÓDULO

### 1. ai-manager ✅ PASS
**Arquivo:** `supabase/functions/ai-manager/index.ts`
**Linhas críticas:**
- L143: Recebe `company_id, user_id`
- L153-172: Verifica `check_company_access` → **BLOQUEIA 403 se empresa inativa**
- L187-189: Cria registro em `ai_insight_runs`
- L428-474: Salva recomendações em `ai_recommendations`

**Segurança:**
- ✅ Verifica empresa ativa via RPC `check_company_access`
- ✅ Retorna 403 se bloqueada
- ✅ Filtra por company_id

**Frontend:** `src/hooks/useAIRecommendations.ts` → `useAnalyzeBusiness()`

---

### 2. ai-assistant ✅ PASS
**Arquivo:** `supabase/functions/ai-assistant/index.ts`
**Linhas críticas:**
- L74-93: Verifica `check_company_access` → **BLOQUEIA 403**
- L103-119: Cria registro em `ai_jobs`
- L126-134: Salva mensagem do usuário em `ai_chat_messages`
- L348-356: Salva resposta do assistente
- L359-363: Atualiza `ai_jobs` para `done`
- L374-381: Em erro, atualiza `ai_jobs` para `error`

**Segurança:**
- ✅ Verifica empresa ativa
- ✅ Retorna 403 se bloqueada
- ✅ Loga em ai_jobs com status

**Frontend:** `src/components/ai-assistant/AIAssistantChat.tsx`

---

### 3. ai-menu-creative ⚠️ FAIL
**Arquivo:** `supabase/functions/ai-menu-creative/index.ts`
**Problemas:**
- ❌ **NÃO verifica `check_company_access`** - Aceita qualquer company_id
- ❌ **NÃO loga em ai_jobs**
- ❌ **NÃO está conectado ao frontend**
- ❌ Não salva sugestões no banco (só retorna)

**Ações necessárias:**
1. Adicionar verificação de acesso
2. Adicionar logging em ai_jobs
3. Conectar ao frontend
4. Opcionalmente salvar em `menu_creative_suggestions`

---

### 4. ai-repurchase ✅ PASS
**Arquivo:** `supabase/functions/ai-repurchase/index.ts`
**Linhas críticas:**
- L51: Recebe `company_id`
- L109-133: Salva em `repurchase_suggestions`

**Problemas menores:**
- ⚠️ Não verifica `check_company_access`
- ⚠️ Não loga em `ai_jobs`

**Frontend:** `src/hooks/useRepurchase.ts`

---

### 5. ai-tv-scheduler ⚠️ FAIL
**Arquivo:** `supabase/functions/ai-tv-scheduler/index.ts`
**Linhas críticas:**
- L43-52: Cria registro em `ai_jobs`
- L239-261: Salva em `tv_schedules`
- L265-269: Atualiza ai_jobs para `done`

**Problemas:**
- ❌ **NÃO verifica `check_company_access`**
- ❌ **NÃO está conectado ao frontend**

---

### 6. ai-tv-highlight ✅ PASS
**Arquivo:** `supabase/functions/ai-tv-highlight/index.ts`
**Linhas críticas:**
- L45-53: Cria registro em `ai_jobs`
- L270-278: Salva em `time_highlight_suggestions`
- L281-285: Atualiza ai_jobs para `done`

**Problemas menores:**
- ⚠️ Não verifica `check_company_access`

**Frontend:** `src/hooks/useTimeHighlights.ts` → `useTVHighlightsAnalysis()`

---

### 7. ai-campaigns ✅ PASS
**Arquivo:** `supabase/functions/ai-campaigns/index.ts`
**Linhas críticas:**
- L99-118: Salva campanhas em `campaigns`

**Problemas menores:**
- ⚠️ Não verifica `check_company_access`
- ⚠️ Não loga em `ai_jobs`

**Frontend:** `src/hooks/useCampaigns.ts` → `useAnalyzeCampaigns()`

---

### 8. ai-tts ✅ PASS
**Arquivo:** `supabase/functions/ai-tts/index.ts`
**Características:**
- Não usa company_id (serviço genérico)
- Suporta OpenAI e ElevenLabs
- Fallback entre providers

**Dependências ENV:**
- `OPENAI_API_KEY` - **NÃO CONFIGURADA**
- `ELEVENLABS_API_KEY` - **NÃO CONFIGURADA**

**Resultado:** Retorna `503` "No TTS provider configured"

**Frontend:** `src/hooks/useTTS.ts`

---

### 9. ai-menu-highlight ✅ PASS
**Arquivo:** `supabase/functions/ai-menu-highlight/index.ts`
**Linhas críticas:**
- Cria registro em `ai_jobs`
- Salva em `time_highlight_suggestions`

**Frontend:** `src/hooks/useTimeHighlights.ts` → `useMenuHighlightsAnalysis()`

---

### 10. analyze-business ⚠️ FAIL
**Arquivo:** `supabase/functions/analyze-business/index.ts`
**Linhas críticas:**
- L56-59: Cria registro em `ai_insight_runs`
- L70-84: Busca dados
- Salva em `ai_recommendations`

**Problemas:**
- ❌ **NÃO verifica `check_company_access`**
- ❌ **NÃO está conectado ao frontend**
- ⚠️ Parece ser versão antiga do ai-manager

---

## RESUMO DE SEGURANÇA

### Funções com verificação de acesso (403):
- ✅ ai-manager
- ✅ ai-assistant

### Funções SEM verificação de acesso (RISCO):
- ❌ ai-menu-creative
- ❌ ai-repurchase
- ❌ ai-tv-scheduler
- ❌ ai-tv-highlight
- ❌ ai-campaigns
- ❌ ai-menu-highlight
- ❌ analyze-business

---

## CONFIGURAÇÃO DE SECRETS

| Secret | Status | Usado por |
|--------|--------|-----------|
| `AI Provider Keys` | ✅ Via UI (ai_provider_config) | Todos os módulos de IA |
| `OPENAI_API_KEY` | ❌ NÃO configurada | ai-tts |
| `ELEVENLABS_API_KEY` | ❌ NÃO configurada | ai-tts |

---

## INSTRUMENTAÇÃO DE LOGS (ai_jobs)

| Função | Cria Job | Atualiza done | Atualiza error |
|--------|----------|---------------|----------------|
| ai-manager | ❌ (usa insight_runs) | N/A | N/A |
| ai-assistant | ✅ | ✅ | ✅ |
| ai-menu-creative | ❌ | ❌ | ❌ |
| ai-repurchase | ❌ | ❌ | ❌ |
| ai-tv-scheduler | ✅ | ✅ | ❌ (só try/catch genérico) |
| ai-tv-highlight | ✅ | ✅ | ❌ |
| ai-campaigns | ❌ | ❌ | ❌ |
| ai-tts | ❌ | ❌ | ❌ |
| ai-menu-highlight | ✅ | ✅ | ❌ |
| analyze-business | ❌ (usa insight_runs) | N/A | N/A |

---

## PRÓXIMOS PASSOS (Prioridade)

### CRÍTICO (Segurança):
1. Adicionar `check_company_access` em TODAS as funções de IA
2. Retornar 403 para empresas bloqueadas

### ALTA (Observabilidade):
3. Adicionar ai_jobs tracking em todas as funções
4. Garantir atualização de status (done/error)
5. Adicionar cost_estimate onde possível

### MÉDIA (Funcionalidade):
6. Conectar ai-menu-creative ao frontend
7. Conectar ai-tv-scheduler ao frontend
8. Remover analyze-business (duplicado do ai-manager)

### BAIXA (TTS):
9. Decidir se vai usar OpenAI/ElevenLabs para TTS
10. Configurar secrets necessárias
