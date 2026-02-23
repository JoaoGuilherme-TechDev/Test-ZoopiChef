import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageNumbers: number[];
  pageSizeOptions: number[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onFirstPage?: () => void;
  onLastPage?: () => void;
  className?: string;
  showPageSizeSelector?: boolean;
  showTotalItems?: boolean;
  compact?: boolean;
}

export function PaginationControls({
  page,
  pageSize,
  totalPages,
  totalItems,
  pageNumbers,
  pageSizeOptions,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onPageSizeChange,
  onNextPage,
  onPrevPage,
  onFirstPage,
  onLastPage,
  className,
  showPageSizeSelector = true,
  showTotalItems = true,
  compact = false,
}: PaginationControlsProps) {
  if (totalItems === 0) {
    return null;
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-4',
        compact && 'py-2',
        className
      )}
    >
      {/* Info de itens */}
      {showTotalItems && (
        <div className="text-sm text-muted-foreground">
          {compact ? (
            <span>{totalItems} itens</span>
          ) : (
            <span>
              Mostrando {startItem} a {endItem} de {totalItems} itens
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Seletor de tamanho de página */}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Por página:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navegação de páginas */}
        <div className="flex items-center gap-1">
          {/* Primeira página */}
          {onFirstPage && !compact && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onFirstPage}
              disabled={!hasPrevPage}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Página anterior */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onPrevPage}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Números de página */}
          {!compact && (
            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
            </div>
          )}

          {/* Indicador compacto */}
          {compact && (
            <span className="text-sm text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
          )}

          {/* Próxima página */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onNextPage}
            disabled={!hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Última página */}
          {onLastPage && !compact && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onLastPage}
              disabled={!hasNextPage}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
