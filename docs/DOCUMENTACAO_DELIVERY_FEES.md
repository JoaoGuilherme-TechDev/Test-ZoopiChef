# Módulo: Configurações de Entrega

**Data:** 2025-12-27  
**Versão:** 1.0

---

## Arquivos Criados/Alterados

| Arquivo | Ação |
|---------|------|
| `src/pages/settings/SettingsDelivery.tsx` | ✅ Criado |
| `src/hooks/usePublicDeliveryFee.ts` | ✅ Criado |
| `src/components/menu/CartSheet.tsx` | ✅ Alterado |
| `src/components/layout/AppSidebar.tsx` | ✅ Alterado |
| `src/App.tsx` | ✅ Alterado |

---

## Tabelas Utilizadas (já existentes)

| Tabela | Descrição |
|--------|-----------|
| `delivery_fee_config` | Configuração geral (modo, origem, fallback) |
| `delivery_fee_neighborhoods` | Taxa por bairro |
| `delivery_fee_ranges` | Taxa por faixa de km |

---

## Funcionalidades Implementadas

### 1. Página /settings/delivery
- Toggle modo: Por Bairro / Por Raio
- Configuração de origem e distância máxima
- CRUD de bairros com taxa e ETA
- CRUD de faixas de km com validação de sobreposição
- Taxa fallback configurável
- Opção de permitir taxa manual

### 2. Checkout /m/:token
- Seleção de bairro (se modo = neighborhood)
- Cálculo automático da taxa
- Exibição da taxa antes de confirmar
- Taxa salva no pedido (delivery_fee)

### 3. Hook usePublicDeliveryFee
- Busca configurações públicas por company_id
- Função calculate() para cálculo automático

---

## Como Testar

1. Acesse `/settings/delivery` no painel admin
2. Selecione modo "Por Bairro"
3. Adicione 3 bairros com taxas diferentes (ex: Centro R$5, Zona Sul R$10)
4. Acesse o link público `/m/:token`
5. Adicione produtos ao carrinho
6. Selecione "Entrega"
7. Escolha um bairro da lista
8. Verifique a taxa exibida
9. Finalize o pedido
10. Verifique no painel de pedidos se a taxa foi salva

---

## Segurança

- ✅ RLS ativo nas tabelas
- ✅ Apenas admin pode editar configurações
- ✅ Checkout público lê apenas dados ativos
- ✅ Multi-tenant via company_id

---

## Pendências Menores

- Geocoding automático para modo raio (requer API externa)
- Feature flag delivery_fees_v1 (pode ser adicionado via companies.feature_flags)

---

**Status:** ✅ Implementado e funcional
