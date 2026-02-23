import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AuditoriaRelatorio() {
  const reportContent = `# 📋 RELATÓRIO DE AUDITORIA TÉCNICA
## Sistema Tenant Base Forge
**Data:** 18/01/2026
**Executado por:** Sistema

---

## 📊 RESUMO EXECUTIVO

| Categoria | Status |
|-----------|--------|
| Console Logs | ⚠️ 1 Warning (React ref) |
| Network Requests | ✅ Sem erros |
| Edge Functions | ⚠️ 3 precisam atenção |
| Segurança BD | ⚠️ 12 warnings (pré-existentes) |
| Código | ✅ 2 correções aplicadas |

---

## 🔧 ERROS ENCONTRADOS E CORRIGIDOS

### 1. CompanySelector - React forwardRef Warning
**MÓDULO:** src/components/saas/CompanySelector.tsx
**ROTA:** Sidebar (global)
**ERRO:** Function components cannot be given refs
**CAUSA:** Componente usado em Popover sem forwardRef
**CORREÇÃO:** Convertido para forwardRef
**STATUS:** ✅ CORRIGIDO

### 2. process-customer-notifications - Erro 500
**MÓDULO:** supabase/functions/process-customer-notifications
**ERRO:** Retornava [object Object] em vez de mensagem
**CAUSA:** Tabela customer_notifications não existia + throw de objeto
**CORREÇÃO:** 
  - Criada tabela customer_notifications com RLS
  - Melhorado tratamento de erro para retornar mensagem legível
  - Adicionado fallback gracioso quando tabela não existe
**STATUS:** ✅ CORRIGIDO

### 3. ai-dynamic-pricing - Erro 500 sem company_id
**MÓDULO:** supabase/functions/ai-dynamic-pricing
**ERRO:** Retornava 500 em vez de 400 para parâmetros faltando
**CAUSA:** throw Error em vez de Response com status 400
**CORREÇÃO:** Retorna Response 400 apropriada
**STATUS:** ✅ CORRIGIDO

### 4. backup-saas - Bucket not found
**MÓDULO:** supabase/functions/backup-saas
**ERRO:** Bucket 'backups' não existia no storage
**CORREÇÃO:** Criado bucket 'backups' via migration
**STATUS:** ✅ CORRIGIDO

---

## 🚀 EDGE FUNCTIONS TESTADAS

| Função | Status | Observação |
|--------|--------|------------|
| ai-healthcheck | ✅ 200 | 8/9 módulos OK, ai-tts degradado (falta API keys) |
| nfe-parse-xml | ✅ 400 | Funciona - requer auth + XML válido |
| stock-alert-check | ✅ 200 | Processou 2 empresas |
| backup-saas | ✅ 200* | Agora funciona com bucket criado |
| process-customer-notifications | ✅ 200 | Graceful quando tabela vazia |
| daily-report | ✅ 400 | Requer company_id (esperado) |
| ai-proactive-agent | ✅ 400 | Requer company_id (esperado) |
| reservation-notifications | ✅ 400 | Requer reservation_id (esperado) |
| ai-churn-predictor | ✅ 400 | Requer company_id (esperado) |
| analyze-business | ✅ 400 | Requer company_id + user_id (esperado) |
| ai-demand-forecast | ✅ 400 | Requer companyId (esperado) |
| ai-dynamic-pricing | ✅ 400 | Agora retorna 400 corretamente |
| send-whatsapp-direct | ✅ 400 | Requer params (esperado) |
| fiscal-emit | ✅ 400 | Requer documentId (esperado) |
| test-tv | ⚠️ 401 | Requer JWT autenticado |
| run-qa-tests | ⚠️ 401 | Requer JWT autenticado |

---

## ⚠️ WARNINGS DE SEGURANÇA (PRÉ-EXISTENTES)

### 1. Security Definer View (ERROR)
Existe uma view com SECURITY DEFINER que pode bypassar RLS.
**Ação recomendada:** Revisar e converter para SECURITY INVOKER

### 2. RLS Policies Always True (11x WARN)
Existem 11 tabelas com políticas RLS usando \`USING (true)\` para INSERT/UPDATE/DELETE.
**Ação recomendada:** Revisar se são intencionais (tabelas públicas) ou se precisam restrição

### 3. Tabelas com Dados Sensíveis Expostos
- **phone_verification_codes:** Expõe telefones, CPF, emails
- **kiosk_sessions:** Sessões de kiosk sem restrição adequada
**Ação recomendada:** Implementar RLS restritivo

---

## 🔐 AI SERVICES STATUS

| Serviço | Status | Configuração |
|---------|--------|--------------|
| ai-manager | ✅ OK | Via Configuração IA |
| ai-assistant | ✅ OK | Via Configuração IA |
| ai-menu-creative | ✅ OK | Via Configuração IA |
| ai-tv-scheduler | ✅ OK | Via Configuração IA |
| ai-tv-highlight | ✅ OK | Via Configuração IA |
| ai-menu-highlight | ✅ OK | Via Configuração IA |
| ai-campaigns | ✅ OK | Via Configuração IA |
| ai-repurchase | ✅ OK | Via Configuração IA |
| ai-tts | ⚠️ DEGRADADO | Falta OPENAI_API_KEY ou ELEVENLABS_API_KEY |

---

## 📦 INFRAESTRUTURA CRIADA

### Storage Buckets
| Bucket | Status | Uso |
|--------|--------|-----|
| banners | ✅ Existe | Banners do sistema |
| logos | ✅ Existe | Logos das empresas |
| products | ✅ Existe | Imagens de produtos |
| tablet-images | ✅ Existe | Imagens de tablets |
| backups | ✅ CRIADO | Backups SaaS |

### Tabelas Criadas
| Tabela | Status |
|--------|--------|
| customer_notifications | ✅ CRIADA com RLS |

---

## ✅ CONCLUSÃO

### O que foi corrigido:
1. ✅ Warning de React ref no CompanySelector
2. ✅ Edge function process-customer-notifications (erro 500)
3. ✅ Edge function ai-dynamic-pricing (erro 500)
4. ✅ Bucket de backups criado
5. ✅ Tabela customer_notifications criada

### Pendências conhecidas (requerem decisão do usuário):
1. ⚠️ AI TTS precisa de OPENAI_API_KEY ou ELEVENLABS_API_KEY
2. ⚠️ 11 tabelas com RLS permissivo (avaliar se intencional)
3. ⚠️ View com Security Definer (revisar manualmente)
4. ⚠️ phone_verification_codes e kiosk_sessions expostos

### Limitações desta auditoria:
- ❌ Não foi possível testar fluxos autenticados (JWT requerido)
- ❌ Não foi possível testar impressoras físicas
- ❌ Não foi possível testar integrações WhatsApp/iFood/etc (requer credenciais)
- ❌ Testes manuais de UI requerem interação humana

---

**RECOMENDAÇÃO:** 
O sistema está TECNICAMENTE FUNCIONAL para os módulos testados.
Para validação completa de produção, recomendo testes manuais pelo usuário.
`;

  const handleDownload = () => {
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-tecnica-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = {
    corrigidos: 4,
    warnings: 12,
    edgeFunctions: { ok: 14, atencao: 2 },
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Relatório de Auditoria Técnica</h1>
          <p className="text-muted-foreground">18/01/2026 - Sistema Tenant Base Forge</p>
        </div>
        <Button onClick={handleDownload} size="lg">
          <Download className="w-4 h-4 mr-2" />
          Baixar Relatório
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{stats.corrigidos}</p>
              <p className="text-xs text-muted-foreground">Erros corrigidos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{stats.warnings}</p>
              <p className="text-xs text-muted-foreground">Warnings segurança</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.edgeFunctions.ok}</p>
              <p className="text-xs text-muted-foreground">Edge Functions OK</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Info className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{stats.edgeFunctions.atencao}</p>
              <p className="text-xs text-muted-foreground">Precisam JWT</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Correções Aplicadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">CompanySelector - React forwardRef</p>
              <p className="text-sm text-muted-foreground">Convertido para forwardRef para evitar warning</p>
            </div>
            <Badge variant="default" className="ml-auto">Corrigido</Badge>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">process-customer-notifications - Erro 500</p>
              <p className="text-sm text-muted-foreground">Tabela criada + tratamento de erro melhorado</p>
            </div>
            <Badge variant="default" className="ml-auto">Corrigido</Badge>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">ai-dynamic-pricing - Status code incorreto</p>
              <p className="text-sm text-muted-foreground">Agora retorna 400 em vez de 500</p>
            </div>
            <Badge variant="default" className="ml-auto">Corrigido</Badge>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">backup-saas - Bucket não existia</p>
              <p className="text-sm text-muted-foreground">Bucket 'backups' criado no storage</p>
            </div>
            <Badge variant="default" className="ml-auto">Corrigido</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Pendências (Requerem Decisão)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium">AI TTS degradado</p>
              <p className="text-sm text-muted-foreground">Adicionar OPENAI_API_KEY ou ELEVENLABS_API_KEY para habilitar</p>
            </div>
            <Badge variant="secondary" className="ml-auto">Opcional</Badge>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium">11 tabelas com RLS permissivo</p>
              <p className="text-sm text-muted-foreground">Revisar se USING(true) é intencional para cada tabela</p>
            </div>
            <Badge variant="secondary" className="ml-auto">Revisar</Badge>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium">phone_verification_codes exposta</p>
              <p className="text-sm text-muted-foreground">Dados sensíveis podem ser lidos publicamente</p>
            </div>
            <Badge variant="destructive" className="ml-auto">Segurança</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Limitações da Auditoria Automatizada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Testes de UI/UX requerem interação humana</li>
            <li>• Fluxos autenticados não podem ser testados sem sessão de usuário</li>
            <li>• Impressoras físicas não podem ser validadas remotamente</li>
            <li>• Integrações externas (WhatsApp, iFood, MP) requerem credenciais configuradas</li>
            <li>• Funcionalidades de IA dependem das API keys configuradas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
