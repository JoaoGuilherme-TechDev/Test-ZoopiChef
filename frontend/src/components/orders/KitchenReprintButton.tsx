import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Printer, ChefHat, FileEdit, Loader2, Receipt } from 'lucide-react';
import { Order } from '@/hooks/useOrders';
import { usePrintSectors, useProductPrintSectors, PrintSector } from '@/hooks/usePrintSectors';
import { useCompany } from '@/hooks/useCompany';
import { usePrintJobQueue } from '@/hooks/usePrintJobQueue';
import { printChangeTicket } from '@/lib/print/kitchenTicket';
import { groupItemsBySector } from '@/lib/print/sectorPrint';
import { toast } from 'sonner';

interface KitchenReprintButtonProps {
  order: Order & { 
    edit_version?: number;
    items?: Array<{
      id: string;
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      notes: string | null;
      edit_status?: 'new' | 'modified' | 'removed' | null;
      previous_quantity?: number | null;
      previous_notes?: string | null;
    }>;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
}

// Debounce timeout in ms
const DEBOUNCE_MS = 1000;

export function KitchenReprintButton({ order, variant = 'outline', size = 'sm' }: KitchenReprintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const { data: company } = useCompany();
  const { sectors, activeSectors } = usePrintSectors();
  const { mappings } = useProductPrintSectors();
  const { createPrintJob } = usePrintJobQueue();
  const lastPrintRef = useRef<string | null>(null);

  // Build product-sector map
  const productSectorMap = new Map<string, PrintSector[]>();
  mappings.forEach((m: any) => {
    const sectorId = m.sector_id || m.sector?.id;
    const sector = sectors.find((s) => s.id === sectorId);
    if (sector) {
      if (!productSectorMap.has(m.product_id)) {
        productSectorMap.set(m.product_id, []);
      }
      productSectorMap.get(m.product_id)!.push(sector);
    }
  });

  // Get items with edit status
  const hasEditedItems = order.items?.some((item: any) => item.edit_status);
  const isEdited = order.edit_version && order.edit_version > 0;

  /**
   * Print all sectors (production tickets)
   */
  const handlePrintAll = useCallback(async () => {
    // Debounce check
    const printKey = `all-${order.id}`;
    if (lastPrintRef.current === printKey) {
      return;
    }
    lastPrintRef.current = printKey;
    setTimeout(() => { lastPrintRef.current = null; }, DEBOUNCE_MS);

    if (!company?.id) {
      toast.error('Empresa não identificada');
      return;
    }

    setIsPrinting(true);
    try {
      if (activeSectors.length > 0) {
        // Queue job for each sector
        let successCount = 0;
        let failCount = 0;

        for (const sector of activeSectors) {
          // Skip sectors without configured printers in network mode
          if (sector.print_mode === 'network' && !sector.printer_host) {
            console.warn(`[KitchenReprint] Skipping sector "${sector.name}" - no printer configured`);
            failCount++;
            continue;
          }

          try {
            await createPrintJob.mutateAsync({
              orderId: order.id,
              printSectorId: sector.id,
              companyId: company.id,
              source: 'manual',
              ticketType: 'production',
            });
            successCount++;
          } catch (err) {
            failCount++;
            console.error(`[KitchenReprint] Failed to queue sector "${sector.name}":`, err);
          }
        }

        if (successCount > 0 && failCount === 0) {
          toast.success(`✅ ${successCount} setores enviados para impressão`);
        } else if (successCount > 0) {
          toast.warning(`${successCount} setores enviados, ${failCount} falharam`);
        } else {
          toast.error('Nenhum setor pôde ser enviado para impressão');
        }
      } else {
        // No sectors: queue production ticket
        await createPrintJob.mutateAsync({
          orderId: order.id,
          companyId: company.id,
          source: 'manual',
          ticketType: 'production',
        });
        toast.success('✅ Enviado para impressão (produção)');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Falha ao enviar para impressão: ${errorMessage}`);
      console.error('[KitchenReprint] Print failed:', { orderId: order.id, error });
    } finally {
      setIsPrinting(false);
    }
  }, [order.id, company, activeSectors, createPrintJob]);

  /**
   * Print for a specific sector
   */
  const handlePrintSector = useCallback(async (sectorId: string) => {
    // Debounce check
    const printKey = `sector-${order.id}-${sectorId}`;
    if (lastPrintRef.current === printKey) {
      return;
    }
    lastPrintRef.current = printKey;
    setTimeout(() => { lastPrintRef.current = null; }, DEBOUNCE_MS);

    if (!company?.id) {
      toast.error('Empresa não identificada');
      return;
    }

    const sector = sectors.find((s) => s.id === sectorId);
    if (!sector) {
      toast.error('Setor não encontrado');
      return;
    }

    // Check if sector has printer configured
    if (sector.print_mode === 'network' && !sector.printer_host) {
      toast.error(`Impressão indisponível: impressora do setor "${sector.name}" não configurada.`);
      console.error('[KitchenReprint] Printer not configured:', { sectorId, sectorName: sector.name });
      return;
    }

    setIsPrinting(true);
    try {
      await createPrintJob.mutateAsync({
        orderId: order.id,
        printSectorId: sectorId,
        companyId: company.id,
        source: 'manual',
        ticketType: 'production',
      });

      toast.success(`✅ Enviado para impressão: ${sector.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Falha ao imprimir setor: ${errorMessage}`);
      console.error('[KitchenReprint] Sector print failed:', { orderId: order.id, sectorId, error });
    } finally {
      setIsPrinting(false);
    }
  }, [order.id, company, sectors, createPrintJob]);

  /**
   * Print complete ticket (full order with prices)
   */
  const handlePrintFull = useCallback(async () => {
    // Debounce check
    const printKey = `full-${order.id}`;
    if (lastPrintRef.current === printKey) {
      return;
    }
    lastPrintRef.current = printKey;
    setTimeout(() => { lastPrintRef.current = null; }, DEBOUNCE_MS);

    if (!company?.id) {
      toast.error('Empresa não identificada');
      return;
    }

    setIsPrinting(true);
    try {
      await createPrintJob.mutateAsync({
        orderId: order.id,
        printSectorId: null,
        companyId: company.id,
        source: 'manual',
        ticketType: 'full', // Complete ticket with prices
      });

      toast.success('✅ Ticket completo enviado para impressão');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Falha ao imprimir completo: ${errorMessage}`);
      console.error('[KitchenReprint] Full print failed:', { orderId: order.id, error });
    } finally {
      setIsPrinting(false);
    }
  }, [order.id, company, createPrintJob]);

  /**
   * Print change ticket (items modified/added/removed)
   */
  const handlePrintChanges = useCallback(async () => {
    if (!hasEditedItems) {
      toast.info('Nenhuma alteração para imprimir');
      return;
    }

    // Debounce check
    const printKey = `changes-${order.id}`;
    if (lastPrintRef.current === printKey) {
      return;
    }
    lastPrintRef.current = printKey;
    setTimeout(() => { lastPrintRef.current = null; }, DEBOUNCE_MS);

    setIsPrinting(true);
    try {
      const items = (order.items || []) as any[];
      const changes = {
        addedItems: items.filter((i: any) => i.edit_status === 'new'),
        modifiedItems: items
          .filter((i: any) => i.edit_status === 'modified')
          .map((i: any) => ({
            ...i,
            oldQuantity: i.previous_quantity || undefined,
            oldNotes: i.previous_notes || undefined,
          })),
        removedItems: items
          .filter((i: any) => i.edit_status === 'removed')
          .map((i: any) => ({ product_name: i.product_name, quantity: i.quantity })),
      };

      printChangeTicket(order, changes, company?.name, null);
      toast.success('✅ Ticket de alteração enviado');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Falha ao imprimir alterações: ${errorMessage}`);
      console.error('[KitchenReprint] Changes print failed:', { orderId: order.id, error });
    } finally {
      setIsPrinting(false);
    }
  }, [order.id, order.items, hasEditedItems, company]);

  if (activeSectors.length === 0 && !isEdited) {
    // Simple buttons for no sectors
    return (
      <div className="flex items-center gap-1">
        <Button
          variant={variant}
          size={size}
          onClick={handlePrintAll}
          disabled={isPrinting}
          className="text-orange-600 hover:text-orange-700"
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ChefHat className="h-4 w-4 mr-1" />
              Produção
            </>
          )}
        </Button>
        <Button
          variant={variant}
          size={size}
          onClick={handlePrintFull}
          disabled={isPrinting}
          className="text-blue-600 hover:text-blue-700"
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Receipt className="h-4 w-4 mr-1" />
              Completo
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isPrinting}>
          {isPrinting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Printer className="h-4 w-4 mr-1" />
              Reimprimir
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
        <DropdownMenuLabel className="text-blue-600 font-bold text-xs">
          TICKET COMPLETO
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handlePrintFull}>
          <Receipt className="h-4 w-4 mr-2" />
          Imprimir Completo
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-orange-600 font-bold text-xs">
          PRODUÇÃO / COZINHA
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handlePrintAll}>
          <ChefHat className="h-4 w-4 mr-2" />
          Todos os Setores
        </DropdownMenuItem>

        {hasEditedItems && (
          <DropdownMenuItem onClick={handlePrintChanges}>
            <FileEdit className="h-4 w-4 mr-2" />
            Imprimir Alterações
          </DropdownMenuItem>
        )}

        {activeSectors.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {activeSectors.map((sector) => (
              <DropdownMenuItem 
                key={sector.id} 
                onClick={() => handlePrintSector(sector.id)}
              >
                <div
                  className="w-3 h-3 rounded mr-2 flex-shrink-0"
                  style={{ backgroundColor: sector.color || '#6b7280' }}
                />
                <span className="flex-1 truncate">{sector.name}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
