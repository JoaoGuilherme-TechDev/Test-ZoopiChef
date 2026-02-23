import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  image_url?: string;
}

interface SelfServiceCategoryBarProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function SelfServiceCategoryBar({
  categories,
  selectedCategory,
  onCategorySelect,
}: SelfServiceCategoryBarProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 p-1">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => onCategorySelect(null)}
          className="flex-shrink-0"
        >
          Todos
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => onCategorySelect(category.id)}
            className={cn(
              "flex-shrink-0 gap-2",
              selectedCategory === category.id && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {category.image_url && (
              <img
                src={category.image_url}
                alt={category.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            )}
            {category.name}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
