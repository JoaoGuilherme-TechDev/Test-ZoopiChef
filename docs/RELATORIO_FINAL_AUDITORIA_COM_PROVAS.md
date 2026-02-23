# RELATÓRIO FINAL DE AUDITORIA (COM PROVAS) — ZOOPI

**Data:** 2025-12-28  
**Versão:** 2.0 (revisão com evidências rastreáveis)  
**Padrão de aceite:** *PASS somente com prova reproduzível (IDs + queries + prints + logs). Sem prova = FAIL.*

---

## 0) CONTEXTO / ESCOPO

- Ambiente: Zoopi (Lovable Cloud)
- Multi-tenant obrigatório: `company_id` + RLS + bloqueio por empresa.
- Regra operacional: **nenhuma alteração de dados será executada por IA sem confirmação humana**.

---

## 1) CHECKLIST FINAL PASS/FAIL (TODOS OS MÓDULOS)

> **Legenda de Evidência**
> - **DB** = queries SQL (com IDs reais)
> - **PRINT** = screenshots capturados
> - **LOG** = logs de função/execução (quando disponíveis)

| Módulo / Fluxo | Status | O que foi corrigido | Arquivos alterados | Evidência técnica (rastreável) | Passo a passo de teste |
|---|---|---|---|---|---|
| 1) Pedido Online (público) | **PASS (parcial)** | N/A nesta rodada | N/A | **DB:** `orders.id=16c0ea65-e58d-4fa6-81fc-748467bdb0dd` + `order_items.id=e3f69e58-8d76-4546-9e61-5d15422742f8`  
**PRINT:** `/m/m_90bbe77332a1a294d57df073` e `/:slug` (ver seção 2.1) | 1) Abrir `/m/<menu_token>` 2) Adicionar item 3) Checkout 4) Ver pedido em `/orders` |
| 2) Pedido por Operador (telefone) | **FAIL** | Não auditado com evidência rastreável nesta execução | N/A | **Sem prova:** não há `order_id` criado via PhoneOrder com rastreio. | (Requer execução guiada) Criar 1 pedido no `/phone-order` e coletar IDs + prints |
| 3) Taxa de Entrega — Modo Raio | **PASS (parcial)** | N/A nesta rodada | N/A | **DB:** `delivery_fee_ranges` existem (3 faixas) para `company_id=4d548b4f-cbcc-4f1b-832b-721424dc5902` (ver seção 2.3)  
**DB:** pedido com taxa aplicada `delivery_fee=12.00` no `order_id=16c0ea65-e58d-4fa6-81fc-748467bdb0dd` | 1) Configurar origem/raio 2) Checkout com endereço em km diferente 3) Conferir taxa no resumo e no pedido |
| 3) Taxa de Entrega — Modo Bairro | **FAIL** | Não há bairros cadastrados (sem prova de execução) | N/A | **DB:** `delivery_fee_neighborhoods` retorna **0 rows** para a empresa (ver seção 2.3). | (Requer execução guiada) Cadastrar 2 bairros e validar no checkout |
| 4) Kanban Operacional (status + eventos) | **FAIL** | Eventos existem para *novo→preparo* (manual), mas **não há prova de em_rota/entregue vinculados ao app do entregador** | N/A | **DB:** existe evento `order_status_events.id=218218df-05eb-46f5-baab-8a2b292046fe` (novo→preparo)  
**DB:** **não há** eventos `to_status in ('em_rota','entregue')` no período (ver seção 2.4) | (Requer execução guiada) mover pedido por 3 status e validar `order_status_events` |
| 5) App do Entregador (PWA) | **FAIL (antes do patch)** | **Correção:** registrar `order_status_events` quando o app muda status | `supabase/functions/deliverer-orders/index.ts` | **DB:** existe entregador token `62bd4664-0054-4716-a4de-8e3acb583781` e pedido entregue com `deliverer_id` (ver seção 2.5), porém **sem eventos comprovando origem do app**.  
**PATCH:** agora a função grava `order_status_events` com `meta.source='deliverer_app'` (requer re-teste) | 1) Abrir `/deliverer/<token>` 2) Iniciar entrega 3) Confirmar entrega 4) Rodar query de eventos (seção 2.5) |
| 6) SaaS Admin (cobrança) | **FAIL** | Não auditado com prova (CRUD + bloqueio + clone) nesta execução | N/A | **Sem prova rastreável** (IDs de empresa criada/clonagem/bloqueio + prints). | (Requer execução guiada) criar empresa, clonar cardápio e bloquear e provar 403 |
| IA (todas) — job_id + input + output + tempo + bloqueio | **FAIL** | Não há 3 execuções reais por IA; logs de funções não disponíveis via ferramentas no momento | N/A | **DB:** `ai_jobs` tem **apenas 1** registro (id `6c8eee01-d456-482b-bfe9-eeab511ccbf8`, type `assistant`) — insuficiente (ver seção 2.6). | (Requer execução guiada) rodar 3 execuções por IA via frontend e coletar `ai_jobs` + outputs |
| Segurança — leaked password protection | **FAIL** | Pendente habilitação | N/A | **Sem evidência de habilitação**; requisito do prompt: sem isso não é “100% funcional”. | Habilitar proteção de senha vazada no painel de autenticação (ver seção 3) |
| Multi-tenant adversarial (Empresa A vs B) | **FAIL** | Só existe 1 empresa no ambiente; impossível provar isolamento A vs B | N/A | **DB:** apenas `companies.count=1` (ver seção 2.7) | (Requer execução guiada) criar empresa B + usuário B e executar queries adversariais |
| Limpeza de escopo (campos órfãos aparece_totem / aparece_qrcode) | **FAIL** | Não tratado nesta rodada | N/A | Sem prova de remoção/isolamento/hide UI | Definir decisão: remover, isolar ou esconder UI e documentar |

---

## 2) PACOTE DE PROVAS (POR FLUXO)

### 2.1) Pedido Online (CRÍTICO) — PROVAS

**company_id:** `4d548b4f-cbcc-4f1b-832b-721424dc5902` (zoopi chef)

**Tokens públicos:**
- `menu_token_v2`: `m_90bbe77332a1a294d57df073`
- `slug`: `zoopi-chef`

**PRINTS (capturados):**
- `/m/m_90bbe77332a1a294d57df073` (menu público)
- `/zoopi-chef` (menu por slug)

**Pedido real (DB):**
- **order_id:** `16c0ea65-e58d-4fa6-81fc-748467bdb0dd`
- **status:** `entregue`
- **delivery_fee:** `12.00`
- **created_at:** `2025-12-27 23:08:15.416943+00`

**Queries de verificação (copiar/colar):**
```sql
select id, company_id, status, total, delivery_fee, created_at
from public.orders
where id = '16c0ea65-e58d-4fa6-81fc-748467bdb0dd';

select id, order_id, product_id, product_name, quantity, unit_price, created_at
from public.order_items
where order_id = '16c0ea65-e58d-4fa6-81fc-748467bdb0dd'
order by created_at asc;
```

---

### 2.2) Pedido por Operador (Telefone) — FAIL (SEM PROVA)

**Motivo do FAIL:** nenhum `order_id` rastreável criado via `/phone-order` foi coletado nesta auditoria.

**Prova mínima exigida para virar PASS (quando executarmos):**
- 1 pedido criado via PhoneOrder com `order_id` + `order_items` + print do fluxo.

---

### 2.3) Taxa de Entrega (CRÍTICO ABSOLUTO)

#### Modo Raio — PROVAS (PARCIAL)

**company_id:** `4d548b4f-cbcc-4f1b-832b-721424dc5902`

**Faixas existentes (DB):**
```sql
select id, min_km, max_km, fee, estimated_minutes, active
from public.delivery_fee_ranges
where company_id='4d548b4f-cbcc-4f1b-832b-721424dc5902'
order by min_km asc;
```

**Pedido com taxa aplicada (DB):**
```sql
select id, company_id, status, total, delivery_fee, created_at
from public.orders
where id='16c0ea65-e58d-4fa6-81fc-748467bdb0dd';
```

#### Modo Bairro — FAIL (SEM PROVAS)

**Evidência do FAIL (sem dados):**
```sql
select id, neighborhood, city, fee, estimated_minutes, active
from public.delivery_fee_neighborhoods
where company_id='4d548b4f-cbcc-4f1b-832b-721424dc5902'
limit 10;
```
(retorna 0 rows neste ambiente)

---

### 2.4) Kanban Operacional — PROVAS (INSUFICIENTE)

**Evento existente (manual):**
- `order_status_events.id=218218df-05eb-46f5-baab-8a2b292046fe`
- `order_id=9e179b47-644d-4108-8202-f879040a2b10`
- `novo → preparo`

**Query:**
```sql
select id, company_id, order_id, from_status, to_status, changed_at, changed_by_user_id, meta
from public.order_status_events
where order_id='9e179b47-644d-4108-8202-f879040a2b10'
order by changed_at asc;
```

**Falha crítica:** não há eventos com `to_status in ('em_rota','entregue')` provando entrega.

---

### 2.5) App do Entregador — PROVAS (ANTES) + PATCH (AGORA)

**Entregador (DB):**
- `deliverer_id=da27e502-1032-4be8-85c6-6026a834f095`
- `token=62bd4664-0054-4716-a4de-8e3acb583781`

**Pedido entregue com entregador atribuído (DB):**
```sql
select o.id as order_id, o.company_id, o.status, o.deliverer_id
from public.orders o
where o.id='16c0ea65-e58d-4fa6-81fc-748467bdb0dd';
```

**Problema que impedia prova:** `deliverer-orders` atualizava `orders.status` mas **não gravava** `order_status_events`.

**Correção aplicada (PATCH):** `deliverer-orders` agora grava `order_status_events` com:
- `meta.source = 'deliverer_app'`
- `meta.deliverer_id = <id>`

**Query de prova após reteste (obrigatória):**
```sql
select id, company_id, order_id, from_status, to_status, changed_at, meta
from public.order_status_events
where order_id = '<ORDER_ID_TESTE>'
order by changed_at asc;
```

---

### 2.6) IA — FAIL (SEM 3 EXECUÇÕES REAIS POR IA)

**Evidência atual (insuficiente):**
- Apenas 1 job em `ai_jobs`:
  - `job_id=6c8eee01-d456-482b-bfe9-eeab511ccbf8`
  - `type=assistant`
  - `status=done`

**Query:**
```sql
select id, company_id, type, status, created_at, updated_at, error_message
from public.ai_jobs
order by created_at desc
limit 20;
```

---

### 2.7) Multi-tenant adversarial — FAIL (ambiente não tem Empresa B)

**Evidência atual:** apenas 1 empresa existe.
```sql
select id, name, slug, is_active, is_blocked, created_at
from public.companies
order by created_at asc;
```

---

## 3) SEGURANÇA (BLOQUEANTE)

### 3.1 Leaked password protection — FAIL

**Motivo:** não há evidência de habilitação; requisito do seu prompt é bloqueante.

**Ação necessária:** habilitar a proteção de senha vazada no sistema de autenticação.

---

## 4) CHECKLIST MANUAL ATUALIZADO (EXECUÇÃO GUIADA PARA VIRAR 100% PASS)

> **IMPORTANTE:** os itens abaixo exigem criação/alteração de dados; só executarei após você confirmar explicitamente.

1) Criar Empresa B + Usuário B (para adversarial multi-tenant)
2) Criar 1 pedido via público (novo order_id) e mover: novo→preparo→pronto→em_rota→entregue (com eventos)
3) Atribuir entregador e finalizar entrega pelo app (provar `meta.source='deliverer_app'`)
4) Cadastrar 2 bairros (modo bairro) e validar no checkout
5) Rodar 3 execuções reais por IA (por módulo), coletando:
   - `job_id`, `input_hash`/payload, output, tempo (created_at→updated_at), status, erro

---

## 5) PENDÊNCIAS REAIS (SEM MAQUIAGEM)

- **FAIL**: PhoneOrder (sem pedido criado com evidência)
- **FAIL**: Modo Bairro taxa (sem dados)
- **FAIL**: Kanban completo (sem em_rota/entregue com eventos)
- **FAIL**: App entregador (sem evento auditável origem do app — **patch aplicado, falta reteste**)
- **FAIL**: IA (sem 3 execuções por IA)
- **FAIL**: Multi-tenant adversarial (não existe empresa B)
- **FAIL**: Leaked password protection (bloqueante)

