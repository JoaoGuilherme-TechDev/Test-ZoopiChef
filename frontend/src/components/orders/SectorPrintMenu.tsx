import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Printer, ChevronDown, Loader2, Receipt, ChefHat } from 'lucide-react';
import { Order } from '@/hooks/useOrders';
import { usePrintSectors, PrintSector } from '@/hooks/usePrintSectors';
import { supabase } from '@/lib/supabase-shim';
import { groupItemsBySector } from '@/lib/print/sectorPrint';
import { useCompany } from '@/hooks/useCompany';
import { usePrintJobQueue } from '@/hooks/usePrintJobQueue';
import { toast } from 'sonner';

interface SectorPrintMenuProps {
  order: Order;
  onPrintAll?: () => void;
  variant?: 'default' | 'icon';
}

// Debounce timeout in ms
const DEBOUNCE_MS = 1000;

export function SectorPrintMenu({ order, onPrintAll, variant = 'default' }: SectorPrintMenuProps) {
  const { activeSectors } = usePrintSectors();
  const { data: company } = useCompany();
  const { createPrintJob } = usePrintJobQueue();
  const [productSectorMap, setProductSectorMap] = useState<Map<string, PrintSector[]>>(new Map());
  const [isPrinting, setIsPrinting] = useState(false);
  const lastPrintRef = useRef<string | null>(null);

  // Load product-sector mappings
  useEffect(() => {
    async function loadMappings() {
      if (!order.items?.length) return;

      const productIds = order.items.map((i) => i.product_id);
      const { data } = await supabase
        .from('product_print_sectors')
        .select('product_id, sector_id, sector:print_sectors(*)')
        .in('product_id', productIds);

      const map = new Map<string, PrintSector[]>();
      data?.forEach((row: any) => {
        if (!map.has(row.product_id)) {
          map.set(row.product_id, []);
        }
        if (row.sector) {
          map.get(row.product_id)!.push(row.sector);
        }
      });
      setProductSectorMap(map);
    }

    loadMappings();
  }, [order.items]);

  const sectorGroups = groupItemsBySector(order, productSectorMap);

  /**
   * Print for a specific sector - sends to print queue
   * Validates printer configuration and provides feedback
   */
  const handlePrintSector = useCallback(async (sectorId: string) => {
    // Debounce check
    const printKey = `sector-${order.id}-${sectorId}`;
    if (lastPrintRef.current === printKey) {
      console.log('[SectorPrintMenu] Debounce: print already triggered');
      return;
    }
    lastPrintRef.current = printKey;
    setTimeout(() => { lastPrintRef.current = null; }, DEBOUNCE_MS);

    const group = sectorGroups.find((g) => g.sector.id === sectorId);
    if (!group) {
      toast.error('Setor não encontrado');
      return;
    }

    if (!company?.id) {
      toast.error('Empresa não identificada');
      return;
    }

    // Check if sector has printer configured (for network mode)
    const sector = group.sector;
    if (sector.print_mode === 'network' && !sector.printer_host) {
      toast.error(`Impressão de setor indisponível: impressora do setor "${sector.name}" não configurada.`);
      console.error('[SectorPrintMenu] Printer not configured:', { 
        sectorId, 
        sectorName: sector.name,
        printMode: sector.print_mode 
      });
      return;
    }

    setIsPrinting(true);
    try {
      // Create print job for this sector - uses production ticket template
      await createPrintJob.mutateAsync({
        orderId: order.id,
        printSectorId: sectorId,
        companyId: company.id,
        source: 'manual',
        ticketType: 'production', // Sector prints are always production tickets
      });

      toast.success(`✅ Enviado para impressão: ${sector.name}`);
      
      console.log('[SectorPrintMenu] Print job created:', {
        orderId: order.id,
        sectorId,
        sectorName: sector.name,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Falha ao imprimir setor: ${errorMessage}`);
      console.error('[SectorPrintMenu] Print job failed:', {
        orderId: order.id,
        sectorId,
        error,
      });
    } finally {
      setIsPrinting(false);
    }
  }, [order.id, sectorGroups, company, createPrintJob]);

  /**
   * Print all sectors - sends multiple jobs to queue
   */
  const handlePrintAllSectors = useCallback(async () => {
    // Debounce check
    const printKey = `allsectors-${order.id}`;
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
      let successCount = 0;
      let failCount = 0;

      for (const group of sectorGroups) {
        // Skip sectors without configured printers in network mode
        if (group.sector.print_mode === 'network' && !group.sector.printer_host) {
          console.warn(`[SectorPrintMenu] Skipping sector "${group.sector.name}" - no printer configured`);
          failCount++;
          continue;
        }

        try {
          await createPrintJob.mutateAsync({
            orderId: order.id,
            printSectorId: group.sector.id,
            companyId: company.id,
            source: 'manual',
            ticketType: 'production',
          });
          successCount++;
        } catch (err) {
          failCount++;
          console.error(`[SectorPrintMenu] Failed to queue sector "${group.sector.name}":`, err);
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`✅ ${successCount} setores enviados para impressão`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} setores enviados, ${failCount} falharam`);
      } else {
        toast.error('Nenhum setor pôde ser enviado para impressão');
      }
    } finally {
      setIsPrinting(false);
    }
  }, [order.id, sectorGroups, company, createPrintJob]);

  /**
   * Print complete ticket (full order with prices)
   */
  const handlePrintComplete = useCallback(async () => {
    // Debounce check
    const printKey = `complete-${order.id}`;
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
      console.error('[SectorPrintMenu] Complete print failed:', {
        orderId: order.id,
        error,
      });
    } finally {
      setIsPrinting(false);
    }
  }, [order.id, company, createPrintJob]);

  // If no sectors configured, show simple buttons (Completo + Imprimir genérico)
  if (activeSectors.length === 0) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={variant === 'icon' ? 'icon' : 'sm'}
          onClick={handlePrintComplete}
          disabled={isPrinting}
          title="Imprimir ticket completo"
          className={variant === 'icon' ? 'h-6 w-6' : ''}
        >
          {isPrinting ? (
            <Loader2 className={`${variant === 'icon' ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`} />
          ) : (
            <>
              <Printer className={variant === 'icon' ? 'h-3 w-3' : 'h-4 w-4 mr-2'} />
              {variant !== 'icon' && 'Imprimir'}
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === 'icon' ? 'icon' : 'sm'}
          className={variant === 'icon' ? 'h-6 w-6' : ''}
          disabled={isPrinting}
        >
          {isPrinting ? (
            <Loader2 className={`${variant === 'icon' ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`} />
          ) : (
            <>
              <Printer className={variant === 'icon' ? 'h-3 w-3' : 'h-4 w-4 mr-2'} />
              {variant !== 'icon' && (
                <>
                  Imprimir
                  <ChevronDown className="h-3 w-3 ml-1" />
                </>
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
        <DropdownMenuLabel className="text-blue-600 font-bold text-xs">
          TICKET COMPLETO
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handlePrintComplete}>
          <Receipt className="h-4 w-4 mr-2" />
          Imprimir Completo
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-orange-600 font-bold text-xs">
          PRODUÇÃO / SETORES
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handlePrintAllSectors}>
          <ChefHat className="h-4 w-4 mr-2" />
          Todos os Setores
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {sectorGroups.map((group) => (
          <DropdownMenuItem
            key={group.sector.id}
            onClick={() => handlePrintSector(group.sector.id)}
          >
            <span
              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
              style={{ backgroundColor: group.sector.color || '#6b7280' }}
            />
            <span className="flex-1 truncate">{group.sector.name}</span>
            <span className="text-muted-foreground text-xs ml-2">
              {group.items?.length || 0}
            </span>
          </DropdownMenuItem>
        ))}
        
        {onPrintAll && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPrintAll} className="text-muted-foreground">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir (navegador)
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
