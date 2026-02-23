import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileText } from 'lucide-react';
import { useNFeImport } from '../hooks/useNFeImport';
import { useNFeWizard } from '../hooks/useNFeWizard';
import { NFeWizardManifestStep } from './wizard/NFeWizardManifestStep';
import { NFeWizardItemsStep } from './wizard/NFeWizardItemsStep';
import { NFeWizardFinancialStep } from './wizard/NFeWizardFinancialStep';
import { NFeWizardCompleteStep } from './wizard/NFeWizardCompleteStep';
import type { NFeFinalizationResult } from '../types/nfe-wizard';

interface NFeWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const STEP_TITLES = {
  manifest: '1. Manifestação',
  items: '2. Entrada de Itens',
  financial: '3. Financeiro',
  complete: 'Concluído',
};

export function NFeWizardDialog({ open, onOpenChange, onComplete }: NFeWizardDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [finalizationResult, setFinalizationResult] = useState<NFeFinalizationResult | null>(null);

  const { parseXML, isProcessing: isParsing } = useNFeImport();
  const wizard = useNFeWizard();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const result = await parseXML(content);
      wizard.initializeFromParse(result);
    } catch (error) {
      console.error('Error parsing XML:', error);
    }
  };

  const handleFinalize = async () => {
    const result = await wizard.finalize();
    setFinalizationResult(result);
  };

  const handleClose = () => {
    wizard.reset();
    setFinalizationResult(null);
    onOpenChange(false);
    onComplete?.();
  };

  const handleNewImport = () => {
    wizard.reset();
    setFinalizationResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Importar NF-e - {wizard.wizardData ? STEP_TITLES[wizard.currentStep] : 'Upload'}
          </DialogTitle>
          <DialogDescription>
            {!wizard.wizardData && 'Faça upload do arquivo XML da nota fiscal'}
            {wizard.currentStep === 'manifest' && 'Confirme a manifestação da NF-e'}
            {wizard.currentStep === 'items' && 'Configure os itens e preços de venda'}
            {wizard.currentStep === 'financial' && 'Configure o financeiro e finalize'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Upload Step */}
          {!wizard.wizardData && (
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p>Processando XML com IA...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Arraste o arquivo XML aqui</p>
                  <p className="text-muted-foreground mb-4">ou clique para selecionar</p>
                  <Button variant="outline">Selecionar Arquivo XML</Button>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".xml" className="hidden" onChange={handleFileSelect} />
            </div>
          )}

          {/* Wizard Steps */}
          {wizard.wizardData && wizard.currentStep === 'manifest' && (
            <NFeWizardManifestStep
              data={wizard.wizardData}
              onManifestChange={wizard.setManifestStatus}
              onNext={wizard.nextStep}
            />
          )}

          {wizard.wizardData && wizard.currentStep === 'items' && (
            <NFeWizardItemsStep
              data={wizard.wizardData}
              onUpdateItem={wizard.updateItem}
              onApplyDefaultCFOP={wizard.applyDefaultCFOP}
              onNext={wizard.nextStep}
              onPrev={wizard.prevStep}
            />
          )}

          {wizard.wizardData && wizard.currentStep === 'financial' && (
            <NFeWizardFinancialStep
              data={wizard.wizardData}
              onSetFinancialData={wizard.setFinancialData}
              onFinalize={handleFinalize}
              onPrev={wizard.prevStep}
              isProcessing={wizard.isProcessing}
            />
          )}

          {wizard.currentStep === 'complete' && (
            <NFeWizardCompleteStep
              result={finalizationResult}
              onClose={handleClose}
              onNewImport={handleNewImport}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
