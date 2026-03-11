import { Category } from '@/modules/products/types';
import { cn } from '@/lib/utils';

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export function CategoryBar({ 
  categories, 
  selectedCategoryId, 
  onSelectCategory 
}: CategoryBarProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="sticky top-16 z-40 bg-[#050214] py-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5 px-4 md:px-0">
      {/* Opção Geral / Cardápio Completo */}
      <button 
        onClick={() => onSelectCategory(null)} 
        className={cn(
          "px-5 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all",
          !selectedCategoryId 
            ? 'bg-[#7c3aed] border-[#8b5cf6] shadow-[0_0_20px_rgba(124,58,237,0.3)] text-white' 
            : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
        )}
      >
        Cardápio
      </button>

      {/* Categorias Dinâmicas */}
      {categories.map(cat => (
        <button 
          key={cat.id} 
          onClick={() => onSelectCategory(cat.id)} 
          className={cn(
            "px-5 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all",
            selectedCategoryId === cat.id 
              ? 'bg-[#7c3aed] border-[#8b5cf6] shadow-[0_0_20px_rgba(124,58,237,0.3)] text-white' 
              : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}