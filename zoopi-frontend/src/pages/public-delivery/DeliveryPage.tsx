import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Contextos e Hooks
import { CartProvider } from '@/modules/public-delivery/contexts/CartContext';
import { usePublicDeliveryMenu } from '@/modules/public-delivery/hooks/usePublicDeliveryMenu';

// Componentes do Módulo
import { DeliveryHeader } from '@/modules/public-delivery/components/layout/DeliveryHeader';
import { CategoryBar } from '@/modules/public-delivery/components/layout/CategoryBar';
import { ActionBanners } from '@/modules/public-delivery/components/layout/ActionBanners';
import { BannerCarousel } from '@/modules/public-delivery/components/layout/BannerCarousel';
import { CartButton } from '@/modules/public-delivery/components/cart/CartButton';
import { CartSheet } from '@/modules/public-delivery/components/cart/CartSheet';
import { FeaturedCarousel } from '@/modules/public-delivery/components/products/FeaturedCarousel';
import { ProductCard } from '@/modules/public-delivery/components/products/ProductCard';



function DeliveryContent() {
  const { slug } = useParams<{ slug: string }>();
  
  // Estados de Interface
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Busca de Dados
  const { data, isLoading } = usePublicDeliveryMenu(slug || '');

  // Lógica de Filtro de Busca
  const filteredProducts = useMemo(() => {
    if (!data) return [];
    const products = data.products || [];
    if (!searchQuery) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [data, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050214] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#7c3aed] h-10 w-10" />
      </div>
    );
  }

  if (!data) return null;

  const { company, categories, featuredProducts } = data;

  return (
    <div className="min-h-screen bg-[#050214] text-white pb-32">
      {/* Cabeçalho e Busca (Componente Extraído) */}
      <DeliveryHeader 
        company={company}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="max-w-7xl mx-auto py-6 space-y-10">
        {!searchQuery ? (
          <>
            {/* Área Institucional e Promoções */}
            <div className="px-4 md:px-0">
              <BannerCarousel companyId={company.id} />
            </div>
            
            <ActionBanners />
            
            <FeaturedCarousel products={featuredProducts} />

            {/* Navegação de Categorias (Componente Extraído) */}
            <CategoryBar 
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
            />

            {/* Grid de Produtos por Categoria */}
            <div className="px-4 md:px-0 space-y-12">
              {categories
                .filter(cat => !selectedCategoryId || cat.id === selectedCategoryId)
                .map(cat => {
                  const catProducts = data.products.filter(p => p.category_id === cat.id);
                  if (!catProducts.length) return null;
                  
                  return (
                    <section key={cat.id}>
                      <h2 className="text-sm font-black text-[#2563eb] uppercase border-b border-blue-900/20 pb-2 mb-6">
                        {cat.name}
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {catProducts.map(p => <ProductCard key={p.id} product={p} />)}
                      </div>
                    </section>
                  );
                })}
            </div>
          </>
        ) : (
          /* Resultados da Busca */
          <div className="px-4 md:px-0 space-y-8">
            <h2 className="text-sm font-black text-[#2563eb] uppercase">
              Resultados para: {searchQuery}
            </h2>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <p className="text-white/40 text-center py-20 uppercase font-black text-xs">
                Nenhum produto encontrado
              </p>
            )}
          </div>
        )}
      </main>

      {/* Interface de Carrinho */}
      <CartButton onClick={() => setIsCartOpen(true)} />
      <CartSheet isOpen={isCartOpen} onOpenChange={setIsCartOpen} company={company} />
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <CartProvider>
      <DeliveryContent />
    </CartProvider>
  );
}