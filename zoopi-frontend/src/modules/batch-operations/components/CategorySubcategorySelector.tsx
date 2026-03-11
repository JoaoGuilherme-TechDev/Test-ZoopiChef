import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategoriesByCategory } from '@/hooks/useSubcategories';
import { Tags, Layers } from 'lucide-react';

interface Props {
  categoryId: string;
  subcategoryId: string;
  onCategoryChange: (value: string) => void;
  onSubcategoryChange: (value: string) => void;
  showSubcategory?: boolean;
}

export function CategorySubcategorySelector({
  categoryId,
  subcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  showSubcategory = true,
}: Props) {
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const validCategoryId = categoryId && categoryId !== 'all' ? categoryId : null;
  const { data: subcategories = [], isLoading: loadingSubcategories } = useSubcategoriesByCategory(validCategoryId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-primary" />
          Categoria
        </Label>
        <Select 
          value={categoryId} 
          onValueChange={(val) => {
            onCategoryChange(val);
            onSubcategoryChange('');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingCategories ? 'Carregando...' : 'Selecione uma categoria'} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showSubcategory && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Subcategoria (opcional)
          </Label>
          <Select 
            value={subcategoryId} 
            onValueChange={onSubcategoryChange}
            disabled={!categoryId || categoryId === 'all'}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !categoryId || categoryId === 'all' 
                  ? 'Selecione uma categoria primeiro' 
                  : loadingSubcategories 
                    ? 'Carregando...' 
                    : 'Todas as subcategorias'
              } />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as subcategorias</SelectItem>
              {subcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
