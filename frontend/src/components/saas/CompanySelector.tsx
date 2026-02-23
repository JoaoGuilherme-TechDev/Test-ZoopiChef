import { useState, forwardRef, type MouseEvent } from 'react';
import { Building2, Check, ChevronsUpDown, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSaasCompanies, useIsSaasAdmin } from '@/hooks/useSaasAdmin';
import { useIsSaasUser } from '@/hooks/useSaasUsers';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { cn } from '@/lib/utils';

export const CompanySelector = forwardRef<HTMLDivElement, {}>(function CompanySelector(props, ref) {
  const { data: isSaasAdmin } = useIsSaasAdmin();
  const { data: isSaasUser } = useIsSaasUser();
  const [open, setOpen] = useState(false);
  const { data: companies = [], isLoading } = useSaasCompanies();
  const { company, selectedCompanyId, setSelectedCompanyId, isSaasAdminMode } = useCompanyContext();

  const handleSelect = (companyId: string) => {
    setSelectedCompanyId(companyId === selectedCompanyId ? null : companyId);
    setOpen(false);
  };

  const handleClear = (e: MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    setSelectedCompanyId(null);
  };

  return (
    <div ref={ref} className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              "w-[280px] justify-between",
              isSaasAdminMode && "border-destructive",
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {company ? company.name : 'Selecionar empresa...'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {selectedCompanyId && (
                <X
                  className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Command>
            <CommandInput placeholder="Buscar empresa..." />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Carregando...' : 'Nenhuma empresa encontrada.'}
              </CommandEmpty>
              <CommandGroup>
                {companies.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => handleSelect(c.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCompanyId === c.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{c.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});

CompanySelector.displayName = 'CompanySelector';
