import { useState } from "react";
import { useTabletSession, TabletSessionProvider } from "@/contexts/TabletSessionContext";
import { useTabletMenu } from "@/hooks/useTabletMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShoppingCart, 
  Bell, 
  Receipt, 
  Utensils, 
  Plus, 
  Minus,
  Loader2,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

// Sub-componente para organizar a lógica dentro do Provider
function TabletContent() {
  const { 
    slug, 
    tableNumber, 
    addToCart, 
    cart, 
    cartTotal, 
    cartCount,
    updateQuantity 
  } = useTabletSession();
  
  const { data: menu, isLoading, isError, refetch } = useTabletMenu(slug);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a14] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs opacity-50">Carregando Cardápio...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a14] p-6 text-center">
        <Card className="glass-card border-red-500/20 p-8 max-w-sm">
          <div className="h-16 w-16 rounded-full border-4 border-red-500 flex items-center justify-center mx-auto mb-6">
            <span className="text-red-500 text-4xl font-black">!</span>
          </div>
          <h2 className="text-xl font-black text-white uppercase mb-2">Erro ao carregar dados</h2>
          <p className="text-sm text-muted-foreground mb-6">Verifique sua conexão e tente novamente</p>
          <Button 
            onClick={() => refetch()}
            className="w-full h-12 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold"
          >
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  // Se não tiver mesa na URL nem no storage, pede para digitar (opcional, dependendo do seu fluxo)
  if (!tableNumber) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a14] p-6 text-center">
        <Card className="glass-card border-primary/20 p-8 max-w-sm">
          <Utensils className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-black text-white uppercase">Mesa não identificada</h2>
          <p className="text-sm text-muted-foreground mt-2">Por favor, peça ajuda ao garçom ou escaneie o QR Code novamente.</p>
        </Card>
      </div>
    );
  }

  const currentCategory = selectedCategoryId 
    ? menu?.categories.find(c => c.id === selectedCategoryId)
    : menu?.categories[0];

  return (
    <div className="h-screen flex flex-col bg-[#0a0a14] text-white overflow-hidden">
      
      {/* HEADER FIXO */}
      <header className="h-20 shrink-0 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {menu?.company.logo_url && (
            <img src={menu.company.logo_url} alt="Logo" className="h-10 w-10 rounded-xl object-contain bg-white/5 p-1" />
          )}
          <div>
            <h1 className="text-sm font-black uppercase tracking-tighter leading-none">{menu?.company.name}</h1>
            <Badge variant="outline" className="mt-1 border-primary/50 text-primary font-black text-[10px]">
              MESA {tableNumber}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-primary/20 hover:text-primary">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-primary/20 hover:text-primary">
            <Receipt className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR DE CATEGORIAS */}
        <aside className="w-24 shrink-0 border-r border-white/5 flex flex-col bg-black/10">
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-4">
              {menu?.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={cn(
                    "w-full flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
                    (selectedCategoryId === cat.id || (!selectedCategoryId && menu.categories[0].id === cat.id))
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-center leading-tight">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* LISTA DE PRODUTOS */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-transparent to-primary/5">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
            {currentCategory?.name || 'Cardápio'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCategory?.subcategories.map(sub => 
              sub.products.map(product => (
                <Card key={product.id} className="glass-card border-none bg-white/5 group hover:bg-white/10 transition-all">
                  <CardContent className="p-4">
                    <div className="h-32 w-full rounded-xl mb-4 overflow-hidden bg-muted/20">
                      {product.image_url ? (
                        <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-base uppercase tracking-tight">{product.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-black text-primary">
                        {formatCurrency(Number(product.prices[0]?.price || 0))}
                      </span>
                      <Button 
                        size="sm" 
                        onClick={() => addToCart(product)}
                        className="rounded-xl h-10 w-10 p-0 bg-primary hover:bg-primary/80"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>

      {/* BARRA DO CARRINHO (FLOAT) */}
      {cartCount > 0 && (
        <div className="h-20 shrink-0 bg-primary p-4 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center relative">
              <ShoppingCart className="h-6 w-6 text-white" />
              <span className="absolute -top-2 -right-2 bg-white text-primary h-6 w-6 rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                {cartCount}
              </span>
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Total do Pedido</p>
              <p className="text-xl font-black text-white leading-none">{formatCurrency(cartTotal)}</p>
            </div>
          </div>
          <Button className="bg-white text-primary hover:bg-white/90 h-12 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl">
            Revisar Pedido
          </Button>
        </div>
      )}
    </div>
  );
}

// Wrapper para garantir o contexto
export default function Tablet() {
  return (
    <TabletSessionProvider>
      <TabletContent />
    </TabletSessionProvider>
  );
}