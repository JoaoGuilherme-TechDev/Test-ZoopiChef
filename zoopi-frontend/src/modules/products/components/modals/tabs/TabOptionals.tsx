import { useNavigate } from "react-router-dom";
import { Layers, CheckCircle2, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductFormData } from "../../../types";

interface TabOptionalsProps {
  formData: ProductFormData;
  onToggleGroup: (groupId: string) => void;
  groups: any[];
  isLoading: boolean;
}

export function TabOptionals({ 
  formData, 
  onToggleGroup, 
  groups, 
  isLoading 
}: TabOptionalsProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card className="bg-card border border-primary/60 rounded-3xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest">
              Grupos de Opcionais
            </CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Vincule grupos de adicionais, sabores ou tamanhos a este produto.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full text-[10px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/10"
            onClick={() => navigate("/products/optional-groups")}
          >
            <Layers className="h-4 w-4 mr-2" />
            Gerenciar
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground animate-pulse font-bold uppercase">
              Carregando grupos de opcionais...
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groups
                .filter((group: any) => group.active)
                .map((group: any) => {
                  const selected = formData.option_group_ids?.includes(group.id);
                  return (
                    <div
                      key={group.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                        selected
                          ? "border-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--primary),0.1)]"
                          : "border-white/5 bg-white/5 hover:bg-white/10"
                      )}
                      onClick={() => onToggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center border transition-colors",
                            selected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-background border-border/40 text-muted-foreground"
                          )}
                        >
                          {selected && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{group.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">
                            {group.min_qty} a {group.max_qty} itens • {group.items?.length || 0} opcionais
                          </p>
                        </div>
                      </div>
                      <Layers
                        className={cn(
                          "h-4 w-4 transition-colors",
                          selected ? "text-primary" : "text-muted-foreground/30"
                        )}
                      />
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-xs">
              <p className="font-black uppercase tracking-widest mb-2">
                Nenhum grupo de opcionais cadastrado
              </p>
              <p className="text-[10px] opacity-80 max-w-xs mx-auto mb-4 font-bold uppercase">
                Crie grupos para vincular adicionais, sabores ou tamanhos aos seus produtos.
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full text-[10px] font-black uppercase tracking-widest"
                onClick={() => navigate("/products/optional-groups")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro grupo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}