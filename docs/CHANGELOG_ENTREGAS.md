# CHANGELOG - Entregas Executadas

**Data:** 2025-12-26
**Versão:** 1.0.0

---

## ENTREGA 1 - REMOVER TOTEM / QRCODE / TABLET ✅

### Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Removidas rotas `/q/:token`, `/t/:token`, `/tablet`, `/tables`, `/qrcode/:slug`, `/totem/:slug`. Removidos imports QRCodeMenu, TotemMenu, Tablet, Tables. |
| `src/components/layout/AppSidebar.tsx` | Removidos menus "Tablet Mesa" e "Mesas" do sidebar. |
| `src/pages/Products.tsx` | Removidas flags de visibilidade `aparece_qrcode`, `aparece_totem`, `aparece_tablet`. Mantidas apenas `aparece_delivery` e `aparece_tv`. |
| `src/pages/MyLinks.tsx` | Removidos cards de links para QR Code e Totem. Mantidos: Menu Delivery, TV, Roleta. |

### Arquivos NÃO Deletados (mas podem ser removidos manualmente se desejado)

- `src/pages/QRCodeMenu.tsx`
- `src/pages/TotemMenu.tsx`
- `src/pages/Tablet.tsx`
- `src/pages/Tables.tsx`
- `src/pages/PublicQRCodeByToken.tsx`
- `src/pages/PublicTotemByToken.tsx`
- `src/hooks/useTotemMenu.ts`
- `src/hooks/useQRCodeMenu.ts`
- `src/hooks/useTables.ts`
- `src/components/totem/*`
- `src/components/qrcode/*`

### Flags/Colunas no Banco

As colunas `aparece_qrcode`, `aparece_totem`, `aparece_tablet` continuam no banco (não foram removidas) para:
- Não quebrar dados existentes
- Permitir reversão se necessário
- Marcadas como DEPRECATED no frontend

---

## ENTREGA 2 - IMPRESSÃO POR SETOR ✅

### Migration Executada

```sql
-- Adiciona campos de configuração de impressora por setor
ALTER TABLE public.print_sectors
ADD COLUMN IF NOT EXISTS print_mode TEXT DEFAULT 'browser' 
  CHECK (print_mode IN ('browser', 'windows', 'network')),
ADD COLUMN IF NOT EXISTS printer_name TEXT,
ADD COLUMN IF NOT EXISTS printer_host TEXT,
ADD COLUMN IF NOT EXISTS printer_port INTEGER DEFAULT 9100;
```

### Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/usePrintSectors.ts` | Adicionado tipo `PrintMode`. Interface `PrintSector` expandida com campos `print_mode`, `printer_name`, `printer_host`, `printer_port`. |
| `src/pages/settings/SettingsPrinting.tsx` | UI atualizada para permitir configurar modo de impressão (Navegador/Windows USB/Rede). Campos condicionais para printer_name e host/port. Validações por modo. |
| `src/lib/print/PrintService.ts` | Novo método `printForSector()` que considera config do setor. Documentação sobre limitações (browser fallback para USB/rede). |

### Comportamento da Impressão

| Modo | Comportamento |
|------|---------------|
| `browser` (padrão) | Usa `window.print()` - funciona em qualquer navegador |
| `windows` | **Fallback para browser** - requer agente desktop local (futuro) |
| `network` | **Fallback para browser** - requer edge function ou agente local (futuro) |

### Nota Importante

A impressão USB/Windows e via rede TCP/IP requer componentes externos que não podem ser implementados puramente em browser:
- **Windows USB:** Necessita aplicativo desktop (Electron, etc.)
- **Rede TCP/IP:** Necessita edge function + agente local

A configuração está preparada para futura integração.

---

## ENTREGA 3 - KDS DINÂMICO POR SETORES ✅

### Status

**JÁ IMPLEMENTADO** - O KDS já funcionava com filtros dinâmicos por setores.

### Funcionalidades Existentes

- Busca setores ativos em tempo real do banco (`print_sectors`)
- Exibe botões de filtro por setor (dinâmicos)
- Mostra contagem de pedidos por status
- Filtra itens por setor selecionado
- Calcula atraso baseado no SLA do setor
- Atualização em tempo real via Supabase Realtime

### Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/KDS.tsx` | Página principal do KDS |
| `src/hooks/useKDS.ts` | Hook com lógica de filtros, stats e realtime |
| `src/hooks/usePrintSectors.ts` | Hook para buscar setores |
| `src/components/kds/KDSOrderCard.tsx` | Card de pedido no KDS |
| `src/components/kds/KDSLayout.tsx` | Layout do KDS |

---

## CHECKLIST DE TESTES MANUAIS

### ✅ ENTREGA 1 - Módulos Cancelados

1. [ ] Acessar `/q/qualquer-token` → Deve retornar 404
2. [ ] Acessar `/t/qualquer-token` → Deve retornar 404
3. [ ] Acessar `/tablet` → Deve retornar 404
4. [ ] Acessar `/tables` → Deve retornar 404
5. [ ] Verificar sidebar → Não deve ter "Tablet Mesa" ou "Mesas"
6. [ ] Verificar página Produtos → Apenas Delivery e TV na visibilidade
7. [ ] Verificar página Meus Links → Apenas Menu, TV e Roleta

### ✅ ENTREGA 2 - Impressão

1. [ ] Ir em Configurações > Impressão
2. [ ] Criar novo setor → Verificar campos de modo de impressão
3. [ ] Selecionar "Windows USB" → Campo "Nome da Impressora" aparece
4. [ ] Selecionar "Rede TCP/IP" → Campos Host e Porta aparecem
5. [ ] Validação: Windows USB sem nome → Erro
6. [ ] Validação: Rede sem host → Erro
7. [ ] Salvar setor → Verificar badge com config de impressão no card
8. [ ] Editar setor existente → Dados carregam corretamente

### ✅ ENTREGA 3 - KDS

1. [ ] Acessar /kds
2. [ ] Verificar botões de filtro por setor (dinâmicos)
3. [ ] Criar novo setor em Configurações > Impressão
4. [ ] Voltar ao KDS → Novo setor aparece nos filtros
5. [ ] Filtrar por setor → Mostra apenas itens do setor
6. [ ] Verificar contadores de status (Novos, Preparo, Prontos)

### ✅ GARANTIAS - Funcionalidades Core

1. [ ] **Pedido Online (/m/:token):** Acessar cardápio público → Funciona
2. [ ] **TV (/tv/:token):** Acessar exibição TV → Funciona
3. [ ] **Pedidos internos (/orders):** Listar e atualizar pedidos → Funciona
4. [ ] **Dashboard:** Carregar estatísticas → Funciona

---

## PRÓXIMOS PASSOS (Sugeridos)

1. **Deletar arquivos mortos** (opcional):
   - Páginas: QRCodeMenu, TotemMenu, Tablet, Tables
   - Hooks: useTotemMenu, useQRCodeMenu, useTables
   - Componentes: totem/*, qrcode/*

2. **Implementar impressão real**:
   - Criar agente desktop para Windows USB
   - Criar edge function para TCP/IP

3. **Migration para remover colunas deprecated** (quando seguro):
   ```sql
   ALTER TABLE products DROP COLUMN aparece_qrcode;
   ALTER TABLE products DROP COLUMN aparece_totem;
   ALTER TABLE products DROP COLUMN aparece_tablet;
   ```

---

**Executado por:** Sistema
**Status:** ✅ Completo
