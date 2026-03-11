/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
  Check, 
  ChevronsUpDown, 
  Search, 
  Building2, 
  LogOut, 
  ShieldCheck 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";

export function CompanySwitcher() {
  const { user } = useAuth();
  const { company, switchCompany, resetToMyCompany, isAdminMode } = useCompanyContext();
  const [open, setOpen] = useState(false);

  // Verificamos se o usuário tem permissão de gestão SaaS
  const canSwitch = user?.global_role === 'ADMIN' || user?.global_role === 'SUPER_ADMIN';

  // Buscamos a lista de todas as empresas (apenas se for admin)
  const { data: companies = [] } = useQuery({
    queryKey: ["admin-companies-list"],
    queryFn: async () => {
      const response = await api.get("/companies"); // Endpoint para listar todas
      return response.data;
    },
    enabled: canSwitch && open, // Só busca quando o Admin abre o seletor
  });

  // Se não for admin, mostra apenas um label simples da empresa atual
  if (!canSwitch) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
        <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-bold truncate text-foreground">
          {company?.name || "Carregando..."}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-12 px-3 rounded-2xl border-white/10 bg-black/20 hover:bg-black/40 hover:border-primary/50 transition-all",
              isAdminMode && "border-primary/60 bg-primary/5 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
            )}
          >
            <div className="flex items-center gap-3 truncate">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                isAdminMode ? "bg-primary text-white" : "bg-white/10 text-muted-foreground"
              )}>
                <Building2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-start truncate">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">
                  {isAdminMode ? "Visualizando Unidade" : "Sua Unidade"}
                </span>
                <span className="text-sm font-bold truncate text-foreground">
                  {company?.name || "Selecionar Loja"}
                </span>
              </div>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 bg-popover/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl" align="start">
          <Command className="bg-transparent">
            <CommandInput placeholder="Buscar unidade pelo nome ou slug..." className="h-12 border-none focus:ring-0" />
            <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
              <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                Nenhuma empresa encontrada.
              </CommandEmpty>
              <CommandGroup heading="Ações">
                <CommandItem
                  onSelect={() => {
                    resetToMyCompany();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 cursor-pointer py-3"
                >
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Minha Conta Principal</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Sair do modo cliente</span>
                  </div>
                </CommandItem>
              </CommandGroup>
              
              <DropdownMenuSeparator className="bg-white/5" />
              
              <CommandGroup heading="Unidades Disponíveis">
                {companies.map((item: any) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      switchCompany(item.slug);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between py-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-medium truncate">{item.name}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">/{item.slug}</span>
                      </div>
                    </div>
                    {company?.id === item.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isAdminMode && (
        <Badge variant="outline" className="w-fit mx-auto bg-primary/10 border-primary/30 text-primary text-[8px] font-black uppercase py-0.5 animate-pulse">
          Modo Administrador Ativo
        </Badge>
      )}
    </div>
  );
}