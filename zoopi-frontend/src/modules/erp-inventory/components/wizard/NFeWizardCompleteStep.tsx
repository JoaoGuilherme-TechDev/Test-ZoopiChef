import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, Package, FileText, CreditCard, 
  RefreshCw, ArrowRight, PartyPopper
} from 'lucide-react';
import type { NFeFinalizationResult } from '../../types/nfe-wizard';

interface NFeWizardCompleteStepProps {
  result: NFeFinalizationResult | null;
  onClose: () => void;
  onNewImport: () => void;
}

export function NFeWizardCompleteStep({ result, onClose, onNewImport }: NFeWizardCompleteStepProps) {
  if (!result) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Processando resultado...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <PartyPopper className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">
          Importação Concluída!
        </h2>
        <p className="text-muted-foreground">
          A NF-e foi processada com sucesso
        </p>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{result.stock_movements_count}</p>
              <p className="text-xs text-muted-foreground">Movimentações de estoque</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{result.updated_recipes_count || 0}</p>
              <p className="text-xs text-muted-foreground">Fichas técnicas atualizadas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              {result.payable_id ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="text-xs text-muted-foreground">Conta a pagar criada</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">-</p>
                  <p className="text-xs text-muted-foreground">Sem financeiro</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings/Errors */}
      {result.errors && result.errors.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-yellow-700">Avisos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-yellow-700 space-y-1">
              {result.errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" onClick={onNewImport}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Importar Outra NF-e
        </Button>
        <Button onClick={onClose}>
          Concluir
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
