# DOCUMENTAÇÃO - Módulo de Entrega Zoopi v1

## Visão Geral

O módulo de entrega implementa rastreabilidade total com auditoria antes/depois no pedido, cálculo automático de taxa por bairro ou raio, UI de fallback, simulador interno e feature flag.

---

## 1. ARQUIVOS CRIADOS/ALTERADOS

### Criados:
| Arquivo | Descrição |
|---------|-----------|
| `src/lib/delivery/calculateDelivery.ts` | Serviço principal de cálculo de entrega |
| `src/pages/settings/DeliverySimulator.tsx` | Simulador de entrega no painel admin |
| `src/hooks/usePublicCustomer.ts` | Hook para gerenciar clientes públicos |
| `src/pages/PublicKDSByToken.tsx` | KDS público via token |

### Alterados:
| Arquivo | Mudanças |
|---------|----------|
| `src/hooks/useOrders.ts` | Interface Order com novos campos auditáveis |
| `src/components/menu/CartSheet.tsx` | Integração com cálculo de entrega |
| `src/lib/print/providers/BrowserPrintProvider.ts` | Impressão melhorada |
| `src/components/orders/OrderCard.tsx` | Status manual |
| `src/App.tsx` | Novas rotas (simulador, KDS público) |

---

## 2. SQL MIGRATION COMPLETA

```sql
-- Campos auditáveis em orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_mode TEXT NULL,
ADD COLUMN IF NOT EXISTS delivery_rule_id UUID NULL,
ADD COLUMN IF NOT EXISTS delivery_rule_snapshot JSONB NULL,
ADD COLUMN IF NOT EXISTS destination_cep TEXT NULL,
ADD COLUMN IF NOT EXISTS destination_address JSONB NULL,
ADD COLUMN IF NOT EXISTS eta_minutes INTEGER NULL;

-- Constraints
ALTER TABLE public.orders 
ADD CONSTRAINT orders_fulfillment_type_check 
CHECK (fulfillment_type IN ('delivery', 'pickup', 'dine_in', 'table'));

ALTER TABLE public.orders 
ADD CONSTRAINT orders_delivery_mode_check 
CHECK (delivery_mode IS NULL OR delivery_mode IN ('neighborhood', 'radius', 'manual'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_type ON public.orders(fulfillment_type);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_mode ON public.orders(delivery_mode);
CREATE INDEX IF NOT EXISTS idx_orders_destination_cep ON public.orders(destination_cep);
```

---

## 3. FUNÇÃO DE CÁLCULO

**Arquivo:** `src/lib/delivery/calculateDelivery.ts`

### Funções Exportadas:

| Função | Descrição |
|--------|-----------|
| `calculateDelivery(companyId, destination)` | Calcula taxa de entrega |
| `createManualSnapshot(feeCents, destination)` | Cria snapshot para taxa manual |
| `isDeliveryFeesV1Enabled(companyId)` | Verifica feature flag |
| `toCents(value)` / `fromCents(cents)` | Conversão reais/centavos |

### Retorno do calculateDelivery:
```typescript
interface DeliveryCalculationResult {
  ok: boolean;                    // Cálculo bem-sucedido
  reason_if_fail?: string;        // Motivo de falha
  mode_used: DeliveryMode | null; // 'neighborhood' | 'radius' | 'manual'
  fee_cents: number;              // Taxa em centavos
  distance_km?: number;           // Distância calculada
  eta_minutes?: number;           // Tempo estimado
  rule_id?: string;               // ID da regra aplicada
  rule_snapshot: object | null;   // Snapshot para auditoria
  needs_fallback: boolean;        // Precisa de fallback UI
  allowed_manual_fee: boolean;    // Permite taxa manual
  available_ranges?: Array;       // Faixas disponíveis (modo raio)
}
```

---

## 4. CHECKLIST DE TESTES MANUAIS

### Testes Públicos (/m/:token):

| # | Teste | Resultado Esperado |
|---|-------|-------------------|
| 1 | Selecionar "Entrega" no tipo de recebimento | Exibir campos de endereço |
| 2 | Inserir CEP válido | Auto-preencher rua/bairro/cidade |
| 3 | Inserir CEP inválido (12345678) | Não preencher, sem erro |
| 4 | Bairro cadastrado + confirmar | Taxa calculada e exibida |
| 5 | Bairro NÃO cadastrado | Fallback UI ou bloqueio |
| 6 | Modo raio com lat/lng válidos | Distância calculada, taxa aplicada |
| 7 | Distância > max_distance_km | "Fora da área de entrega" |
| 8 | Finalizar pedido com entrega | Campos auditáveis salvos no DB |

### Testes Admin (Simulador):

| # | Teste | Resultado Esperado |
|---|-------|-------------------|
| 9 | Simular bairro cadastrado | ok=true, fee calculada |
| 10 | Simular bairro não cadastrado | needs_fallback=true |
| 11 | Simular com lat/lng (modo raio) | distance_km exibida |
| 12 | Simular distância acima do máximo | ok=false, bloqueio |

### Testes de Impressão:

| # | Teste | Resultado Esperado |
|---|-------|-------------------|
| 13 | Imprimir pedido com troco | Troco em fonte invertida |
| 14 | Imprimir pedido delivery | Taxa de entrega no cupom |

---

## 5. EDGE CASES TRATADOS

| Edge Case | Tratamento |
|-----------|------------|
| **CEP inválido** | ViaCEP retorna null, campos ficam vazios |
| **Bairro não cadastrado** | `needs_fallback=true`, UI mostra opções |
| **Faixas sobrepostas** | Primeira faixa encontrada é usada |
| **Distância > máximo** | `ok=false`, entrega bloqueada |
| **Sem lat/lng** | Fallback com taxa padrão |
| **Manual fee sem permissão** | `allowed_manual_fee=false` |
| **Config não existe** | Retorna erro, needs_fallback=true |
| **Acentos no bairro** | Normalização com NFD remove acentos |

---

## 6. CENÁRIOS COMPLETOS (PONTA A PONTA)

### Cenário 1: Entrega por Bairro (Sucesso)
```
1. Cliente acessa /m/{token}
2. Adiciona produtos ao carrinho
3. Clica "Continuar" → Seleciona "Entrega"
4. Digita CEP "01310-100" → Auto-preenche "Bela Vista, São Paulo"
5. Sistema calcula: bairro="Bela Vista" está cadastrado com R$ 8,00
6. Exibe: "Taxa de entrega: R$ 8,00"
7. Cliente confirma pagamento e finaliza
8. No DB: 
   - fulfillment_type = 'delivery'
   - delivery_fee_cents = 800
   - delivery_mode = 'neighborhood'
   - delivery_rule_snapshot = { mode: 'neighborhood', neighborhood_name: 'Bela Vista', ... }
```

### Cenário 2: Entrega por Raio (Com Distância)
```
1. Cliente acessa /m/{token}
2. Adiciona produtos, seleciona "Entrega"
3. Digita endereço com lat/lng conhecidos
4. Sistema calcula haversine: 4.2km
5. Encontra faixa 3-5km com taxa R$ 6,00
6. Exibe: "Taxa de entrega: R$ 6,00 (4.2 km)"
7. Cliente confirma
8. No DB:
   - delivery_fee_cents = 600
   - delivery_mode = 'radius'
   - delivery_distance_km = 4.2
   - delivery_rule_snapshot = { mode: 'radius', min_km: 3, max_km: 5, ... }
```

### Cenário 3: Fallback Manual
```
1. Cliente acessa /m/{token}
2. Seleciona "Entrega", digita bairro "Jardim Novo"
3. Sistema não encontra bairro cadastrado
4. Retorna: needs_fallback=true, allowed_manual_fee=true
5. UI exibe: "Bairro não encontrado. Selecione uma faixa:"
6. Mostra lista de faixas disponíveis
7. Cliente seleciona faixa de 5-10km (R$ 10,00)
8. No DB:
   - delivery_mode = 'manual'
   - delivery_fee_cents = 1000
   - delivery_rule_snapshot = { mode: 'manual', fee_cents: 1000, ... }
```

---

## 7. FEATURE FLAG

A feature flag `delivery_fees_v1` controla o novo fluxo:

```typescript
// Verificar se está ativo
const enabled = await isDeliveryFeesV1Enabled(companyId);

// Habilitar via SQL:
UPDATE companies 
SET feature_flags = COALESCE(feature_flags, '{}') || '{"delivery_fees_v1": true}'
WHERE id = 'company_uuid';
```

**Rollback:** Definir `delivery_fees_v1: false` reverte ao fluxo antigo.

---

## 8. ROTAS ADICIONADAS

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/settings/delivery-simulator` | DeliverySimulator | Simulador de entrega |
| `/kds/:token` | PublicKDSByToken | KDS público via token |

---

## 9. SNAPSHOT PARA AUDITORIA

Estrutura do `delivery_rule_snapshot`:

```json
{
  "mode": "neighborhood",
  "neighborhood_name": "Centro",
  "fee_cents": 500,
  "eta_minutes": 30,
  "destination_cep": "01310100",
  "rule_id": "uuid-da-regra",
  "calculated_at": "2024-01-15T10:30:00Z"
}
```

Para modo raio:
```json
{
  "mode": "radius",
  "min_km": 0,
  "max_km": 5,
  "fee_cents": 600,
  "distance_km": 3.7,
  "eta_minutes": 25,
  "destination_cep": "04567890",
  "rule_id": "uuid-da-regra",
  "calculated_at": "2024-01-15T10:30:00Z"
}
```

---

## 10. PRÓXIMOS PASSOS (ROADMAP)

1. [ ] Integrar geocoding automático via Google/OpenStreetMap
2. [ ] Adicionar histórico de alterações de taxa por operador
3. [ ] Dashboard de métricas de entrega por região
4. [ ] Integração com rastreamento de entregador
5. [ ] Notificações automáticas de ETA para cliente

---

**Implementado por:** Sistema  
**Data:** 2024-12-27  
**Versão:** 1.0.0
