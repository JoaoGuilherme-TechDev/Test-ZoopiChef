import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';
import { createPrintJobV3 } from '@/lib/print/v3/createPrintJobV3';

interface PrinterTestResult {
  success: boolean;
  message: string;
  jobId?: string;
  error?: string;
}

interface PrinterTestLog {
  id: string;
  sectorId: string;
  sectorName: string;
  timestamp: string;
  result: 'pending' | 'success' | 'failed';
  errorMessage?: string;
}

/**
 * Hook para testar impressoras individualmente
 * 
 * REGRAS:
 * - Cada clique = 1 tentativa de teste
 * - Registra log de teste (data, hora, impressora, resultado)
 * - Não permite spam de testes consecutivos (cooldown 3s)
 * - Exibe feedback claro de sucesso ou falha
 */
export function usePrinterTest() {
  const { data: company } = useCompany();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testLogs, setTestLogs] = useState<PrinterTestLog[]>([]);
  const lastTestRef = useRef<Map<string, number>>(new Map());

  // Cooldown de 3 segundos entre testes da mesma impressora
  const COOLDOWN_MS = 3000;

  const testPrinter = useCallback(async (
    sectorId: string,
    sectorName: string,
    printMode: string,
    printerInfo: string
  ): Promise<PrinterTestResult> => {
    if (!company?.id) {
      return { success: false, message: 'Empresa não encontrada', error: 'NO_COMPANY' };
    }

    // Verificar cooldown
    const lastTest = lastTestRef.current.get(sectorId) || 0;
    const now = Date.now();
    if (now - lastTest < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastTest)) / 1000);
      toast.warning(`Aguarde ${remaining}s antes de testar novamente`);
      return { success: false, message: 'Aguarde antes de testar novamente', error: 'COOLDOWN' };
    }

    setTestingId(sectorId);
    lastTestRef.current.set(sectorId, now);

    // Registrar log pendente
    const logEntry: PrinterTestLog = {
      id: `${sectorId}-${now}`,
      sectorId,
      sectorName,
      timestamp: new Date().toISOString(),
      result: 'pending',
    };
    setTestLogs(prev => [logEntry, ...prev.slice(0, 19)]); // Manter últimos 20

    try {
      console.log('[PrinterTest] Criando job de teste para:', { sectorId, sectorName, printMode, printerInfo });

      // Criar job de teste na fila v3 (agente atual consome print_job_queue_v3)
      const created = await createPrintJobV3({
        companyId: company.id,
        jobType: 'printer_test',
        printSectorId: sectorId,
        priority: 1,
        metadata: {
          kind: 'printer_test',
          sector_name: sectorName,
          print_mode: printMode,
          printer_info: printerInfo,
          test_timestamp: new Date().toISOString(),
          system_name: 'Zoopi POS',
          source: 'manual',
        },
      });

      if (!created.success || !created.jobId) {
        throw new Error(created.error || 'Falha ao criar job de teste');
      }

      const jobId = created.jobId;
      console.log('[PrinterTest] Job criado:', jobId);

      // Mostrar feedback inicial
      toast.info(`Teste enviado para ${sectorName}`, {
        description: 'Aguarde a impressão do ticket de teste...',
        duration: 5000,
      });

      // Aguardar até 10 segundos pela conclusão
      if (jobId) {
        const result = await waitForJobCompletion(jobId, sectorName);
        
        // Atualizar log
        setTestLogs(prev => prev.map(log => 
          log.id === logEntry.id 
            ? { ...log, result: result.success ? 'success' : 'failed', errorMessage: result.error }
            : log
        ));

        return result;
      }

      return { success: true, message: 'Teste enviado', jobId };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[PrinterTest] Erro:', errorMsg);

      // Atualizar log com falha
      setTestLogs(prev => prev.map(log => 
        log.id === logEntry.id 
          ? { ...log, result: 'failed', errorMessage: errorMsg }
          : log
      ));

      toast.error(`Falha no teste de ${sectorName}`, {
        description: errorMsg,
        duration: 8000,
      });

      return { success: false, message: 'Falha no teste', error: errorMsg };

    } finally {
      setTestingId(null);
    }
  }, [company?.id]);

  return {
    testPrinter,
    testingId,
    isTestingAny: testingId !== null,
    testLogs,
  };
}

/**
 * Aguarda a conclusão de um job de teste (máx 10 segundos)
 */
async function waitForJobCompletion(
  jobId: string,
  sectorName: string,
  maxWaitMs = 10000
): Promise<PrinterTestResult> {
  const startTime = Date.now();
  const pollInterval = 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const { data: job, error } = await supabase
      .from('print_job_queue_v3')
      .select('status, error_message, completed_at')
      .eq('id', jobId)
      .single();

    if (error) {
      console.warn('[PrinterTest] Erro ao verificar status:', error);
      break;
    }

    if (job?.status === 'completed') {
      toast.success(`✅ Teste de ${sectorName} OK!`, {
        description: 'A impressora está funcionando corretamente.',
        duration: 5000,
      });
      return { success: true, message: 'Impressora funcionando corretamente', jobId };
    }

    if (job?.status === 'failed') {
      const errorMsg = job.error_message || 'Falha na impressão';
      toast.error(`❌ Falha no teste de ${sectorName}`, {
        description: `Erro: ${errorMsg}`,
        duration: 10000,
      });
      return { success: false, message: 'Falha na impressão', error: errorMsg, jobId };
    }

    // Aguardar antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout - job ainda pendente
  toast.warning(`⏳ Teste de ${sectorName} enviado`, {
    description: 'O agente de impressão pode estar offline. Verifique se o ticket foi impresso.',
    duration: 8000,
  });

  return { 
    success: false, 
    message: 'Timeout aguardando resposta do agente', 
    error: 'AGENT_TIMEOUT',
    jobId 
  };
}
