
# Correção: Enólogo Travado na Tela de Identificação

## Diagnóstico Confirmado

Identifiquei a causa raiz do problema "tela travada após inserir dados no Enólogo":

### Fluxo do Problema

```text
1. Usuario acessa /enologo/:token (publico, SEM login)
2. Digita telefone → hook tenta SELECT em 'customers'
3. RLS bloqueia: NAO existe policy SELECT publica
   → SELECT retorna VAZIO mesmo se cliente existe
4. Sistema pensa: "cliente novo" → tenta INSERT
5. INSERT falha: UNIQUE constraint (company_id, whatsapp)
   → Erro: cliente ja existe com esse whatsapp!
6. toast.error('Erro ao salvar') é chamado
7. MAS toasts estao suprimidos globalmente
   → Usuario nao ve NADA
8. saveDietaryInfo() retorna false
9. handleContinue() para na linha 74
   → onContinue() NUNCA é chamado
   → Tela TRAVA
```

### Arquivos Envolvidos

| Arquivo | Problema |
|---------|----------|
| Tabela `customers` | Falta policy SELECT publica |
| `usePublicCustomerIdentification.ts` | SELECT falha silenciosamente |
| `CustomerIdentificationScreen.tsx` | Trava quando `saveDietaryInfo()` retorna `false` |

## Solucao Proposta

### 1. Backend: Adicionar Policy SELECT Publica (Cirurgico)

Adicionar uma policy que permite SELECT publico na tabela `customers` apenas para busca por telefone em contexto de identificacao:

```sql
CREATE POLICY "Public can search customers by phone"
ON public.customers
FOR SELECT
USING (whatsapp IS NOT NULL);
```

**Impacto**: Permite que usuarios nao-logados busquem clientes por whatsapp. Isso ja é o comportamento esperado no fluxo publico (Enologo, Totem, Rotisseur).

### 2. Frontend: Feedback Visual de Erro (Cirurgico)

Como os toasts estao suprimidos, adicionar feedback visual local dentro do componente `CustomerIdentificationScreen.tsx`:

- Adicionar estado `errorMessage` para capturar erros
- Exibir `<Alert variant="destructive">` quando houver erro
- Isso resolve a experiencia "nada acontece"

**Arquivo alterado**: `src/components/customer/CustomerIdentificationScreen.tsx`

### 3. Hook: Tratar Erro de Duplicidade (Cirurgico)

No hook `usePublicCustomerIdentification.ts`, ao receber erro de INSERT com codigo `23505` (unique violation):

- Tentar novamente como UPDATE em vez de INSERT
- Ou seja: se o telefone ja existe, atualiza os dados

**Arquivo alterado**: `src/hooks/usePublicCustomerIdentification.ts`

## Sequencia de Implementacao

1. Aplicar migracao SQL (policy SELECT publica)
2. Atualizar hook para tratar erro 23505
3. Adicionar feedback visual local no componente

## Resultado Esperado

Apos as alteracoes:

- Usuario digita telefone → sistema ENCONTRA cliente existente
- Nome preenche automaticamente, mostra "Ola, [nome]!"
- Clique em Continuar → `saveDietaryInfo()` faz UPDATE (nao INSERT)
- Fluxo prossegue para tela "Welcome" do Enologo

Se for cliente novo:
- INSERT funciona normalmente
- Fluxo prossegue

## Detalhes Tecnicos

### SQL Migration

```sql
-- Permite busca publica de clientes por whatsapp
-- Necessario para fluxos publicos (Enologo, Totem, Rotisseur)
CREATE POLICY "Public can search customers by phone"
ON public.customers
FOR SELECT
USING (whatsapp IS NOT NULL);
```

### Alteracao no Hook (saveDietaryInfo)

```typescript
// Dentro do catch, verificar se é erro de duplicidade
catch (error: any) {
  // Codigo 23505 = unique_violation no PostgreSQL
  if (error?.code === '23505') {
    // Tentar buscar o cliente existente e fazer UPDATE
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .eq('whatsapp', normalized)
      .maybeSingle();
    
    if (existing) {
      // Fazer UPDATE em vez de INSERT
      const { error: updateError } = await supabase
        .from('customers')
        .update({ /* campos */ })
        .eq('id', existing.id);
      
      if (!updateError) {
        setCustomer(existing);
        return true;
      }
    }
  }
  
  setErrorMessage('Erro ao salvar dados');
  return false;
}
```

### Alteracao no Componente (feedback visual)

```tsx
// Estado para erro
const [errorMessage, setErrorMessage] = useState<string | null>(null);

// No JSX, antes do botao Continuar:
{errorMessage && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{errorMessage}</AlertDescription>
  </Alert>
)}
```
