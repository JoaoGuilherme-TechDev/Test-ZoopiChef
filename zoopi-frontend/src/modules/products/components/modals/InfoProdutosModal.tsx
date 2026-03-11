import { 
  Package, 
  Info, 
  FileText, 
  Receipt, 
  DollarSign, 
  X,
  Tag,
  Hash,
  Scale,
  Building2,
  ChefHat,
  Barcode
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Product, Category, Subcategory } from "../../types";

interface InfoProdutosModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  subcategories: Subcategory[];
}

export function InfoProdutosModal({
  isOpen,
  onOpenChange,
  product,
  categories,
  subcategories
}: InfoProdutosModalProps) {
  if (!product) return null;

  const categoryName = product.category?.name || categories.find(c => c.id === product.category_id)?.name || "N/A";
  const subcategoryName = product.subcategory?.name || subcategories.find(s => s.id === product.subcategory_id)?.name || "N/A";

  const InfoSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
        <div className="p-1.5 bg-primary/10 rounded-lg">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {children}
      </div>
    </div>
  );

  const InfoItem = ({ label, value, icon: Icon, color }: { label: string, value: string | number | null | undefined, icon?: any, color?: string }) => (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={color || "h-3.5 w-3.5 text-muted-foreground/60"} />}
        <p className="text-sm font-medium text-foreground">{value || "---"}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 border-[hsla(270,100%,65%,0.22)] shadow-2xl rounded-3xl bg-background backdrop-blur-xl flex flex-col">
        <DialogHeader className="p-8 pb-6 border-b border-primary/10 relative">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-2xl bg-muted/20 border-2 border-primary/20 overflow-hidden flex items-center justify-center">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-10 w-10 text-primary/40" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-foreground">
                  {product.name}
                </DialogTitle>
                <Badge variant={product.active ? "default" : "secondary"} className="rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
                  {product.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground max-w-xl line-clamp-2">
                {product.description || "Nenhuma descrição fornecida."}
              </p>
              <div className="flex gap-3 pt-2">
                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-[10px] font-bold uppercase py-1">
                  {product.type}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-[10px] font-bold uppercase py-1"
                  style={{
                    backgroundColor: product.category?.color ? `${product.category.color}15` : 'rgba(var(--primary), 0.05)',
                    color: product.category?.color || 'var(--primary)',
                    borderColor: product.category?.color ? `${product.category.color}` : 'rgba(var(--primary), 0.2)'
                  }}
                >
                  {categoryName}
                </Badge>
              </div>
            </div>
          </div>
          
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
          {/* Aba Info & Detalhes (Combinados para fluidez) */}
          <InfoSection title="Informações Gerais" icon={Info}>
            <InfoItem label="Nome de Exibição" value={product.name} icon={Tag} />
            <InfoItem label="Código Interno" value={product.internal_code} icon={Hash} />
            <InfoItem label="SKU / Código PDV" value={product.sku} icon={Barcode} />
            <InfoItem label="Local de Produção" value={(product as any).production_location} icon={ChefHat} />
            <InfoItem label="Categoria" value={categoryName} icon={Building2} />
            <InfoItem label="Subcategoria" value={subcategoryName} icon={Building2} />
            <InfoItem label="Marca / Fabricante" value={(product as any).brand} icon={Building2} />
            <InfoItem label="Unidade de Medida" value={(product as any).unit?.toUpperCase()} icon={Scale} />
          </InfoSection>

          <Separator className="bg-primary/5" />

          <InfoSection title="Composição e Detalhes" icon={FileText}>
            <div className="col-span-full space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Descrição Detalhada</p>
                <div className="p-4 rounded-xl bg-muted/30 border border-primary/10">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {product.description || "Sem descrição detalhada."}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Composição / Ingredientes</p>
                <div className="p-4 rounded-xl bg-muted/30 border border-primary/10">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {(product as any).composition || "Nenhuma composição listada."}
                  </p>
                </div>
              </div>
            </div>
            <InfoItem label="Peso Produção" value={(product as any).production_weight} icon={Scale} />
            <InfoItem label="Produto Pesável" value={(product as any).is_weighted ? "Sim" : "Não"} icon={Scale} />
          </InfoSection>

          <Separator className="bg-primary/5" />

          {/* Aba Fiscal */}
          <InfoSection title="Dados Fiscais" icon={Receipt}>
            <InfoItem label="SKU / Código Interno" value={product.sku} icon={Hash} />
            <InfoItem label="EAN (Código de Barras)" value={(product as any).ean} icon={Barcode} />
            <InfoItem label="NCM" value={(product as any).ncm} icon={Receipt} />
            <InfoItem label="CEST" value={(product as any).cest} icon={Receipt} />
            <InfoItem label="Status Tributário" value={(product as any).tax_status} icon={Receipt} />
            <InfoItem label="Referência Interna" value={(product as any).internal_code} icon={Hash} />
          </InfoSection>

          <Separator className="bg-primary/5" />

          {/* Aba Preços */}
          <InfoSection title="Precificação" icon={DollarSign}>
            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Preço de Venda</p>
                <p className="text-3xl font-black text-primary">
                  {product.prices?.[0]?.price ? `R$ ${product.prices[0].price}` : "R$ 0,00"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-muted/30 border border-primary/10 flex flex-col items-center justify-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço de Custo</p>
                <p className="text-2xl font-bold text-foreground">
                  {(product as any).cost_price ? `R$ ${(product as any).cost_price}` : "---"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-muted/30 border border-primary/10 flex flex-col items-center justify-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margem de Lucro</p>
                <p className="text-2xl font-bold text-foreground">
                  {(product as any).profit_margin ? `${(product as any).profit_margin}%` : "---"}
                </p>
              </div>
            </div>
            
            {(product as any).is_on_sale && (
              <div className="col-span-full mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Tag className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-500">Promoção Ativa</p>
                    <p className="text-[10px] font-bold text-emerald-500/70 uppercase">Utilizando preço promocional no menu</p>
                  </div>
                </div>
                <p className="text-xl font-black text-emerald-500">
                  R$ {(product as any).sale_price}
                </p>
              </div>
            )}
          </InfoSection>
        </div>

        <div className="p-8 border-t border-primary/10 bg-muted/10 flex justify-end">
          <DialogClose asChild>
            <button className="h-12 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              Fechar Visualização
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
