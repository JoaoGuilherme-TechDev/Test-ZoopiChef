import { 
  Sparkles, 
  FileSpreadsheet, 
  Receipt, 
  Loader2 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ImportExportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting?: boolean;
}

export function ImportExportModal({ 
  isOpen, 
  onOpenChange, 
  isSubmitting = false 
}: ImportExportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] md:w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto border border-[hsla(270,100%,65%,0.22)] shadow-[0_0_4px_hsla(270,100%,65%,0.5),0_0_16px_hsla(270,100%,65%,0.2),0_8px_28px_rgba(0,0,0,0.5)] rounded-3xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar / Exportar
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">
            Centralize a importação com IA e exportações em um só lugar.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid grid-cols-2 rounded-2xl">
            <TabsTrigger value="import" className="text-[10px] font-black uppercase tracking-widest">
              Importar
            </TabsTrigger>
            <TabsTrigger value="export" className="text-[10px] font-black uppercase tracking-widest">
              Exportar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-6">
            <div className="py-2 space-y-6">
              <div className="space-y-4">
                {/* File Upload Zone */}
                <div className="p-6 sm:p-8 md:p-12 border-2 border-primary rounded-3xl bg-primary/5 flex flex-col items-center text-center group hover:bg-primary/10 transition-all cursor-pointer">
                  <div className="h-16 w-16 bg-background rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-1">Upload de Arquivo</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Excel, CSV ou PDF de Cardápio</p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-primary/20" />
                  </div>
                  <div className="relative flex justify-center text-[9px] uppercase font-black">
                    <span className="bg-card px-4 text-muted-foreground">Ou Cole Texto Abaixo</span>
                  </div>
                </div>

                <Textarea 
                  placeholder="Ex: Pizza Mussarela R$ 45,00&#10;Coca-Cola Lata R$ 6,00..." 
                  className="min-h-[150px] bg-muted/30 border-primary/40 rounded-2xl resize-none p-6 text-sm"
                />
              </div>

              {/* AI Tip */}
              <div className="p-4 bg-primary/5 rounded-2xl border border-[hsla(270,100%,65%,0.22)]">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Dica da IA</h4>
                    <p className="text-[9px] text-muted-foreground uppercase leading-relaxed mt-1">
                      Nossa IA consegue identificar automaticamente categorias, preços e descrições a partir de textos simples ou fotos de cardápios.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  className="font-black uppercase tracking-widest text-[10px]" 
                  onClick={() => onOpenChange(false)}
                >
                  Fechar
                </Button>
                <Button className="font-black uppercase tracking-widest bg-primary text-white rounded-xl px-8 h-12 shadow-lg shadow-primary/20">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Processar com IA
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-border hover:border-primary/50 hover:bg-primary/5 group">
                <FileSpreadsheet className="h-6 w-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase">Excel (.xlsx)</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-[hsla(270,100%,65%,0.22)] hover:border-primary/50 hover:bg-primary/5 group">
                <FileSpreadsheet className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase">CSV</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-border hover:border-primary/50 hover:bg-primary/5 group">
                <Receipt className="h-6 w-6 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase">PDF Listagem</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-border hover:border-primary/50 hover:bg-primary/5 group">
                <Sparkles className="h-6 w-6 text-purple-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase">JSON</span>
              </Button>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button 
                variant="ghost" 
                className="font-black uppercase tracking-widest text-[10px]" 
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}