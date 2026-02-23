import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { Scale, ShoppingCart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelfServiceProduct } from "@/pages/SelfService";

interface SelfServiceProductGridProps {
  products: SelfServiceProduct[];
  currentWeight: number;
  onProductSelect: (product: SelfServiceProduct) => void;
  isSubmitting: boolean;
  calculateValue: (product: SelfServiceProduct) => number;
}

export function SelfServiceProductGrid({
  products,
  currentWeight,
  onProductSelect,
  isSubmitting,
  calculateValue,
}: SelfServiceProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Scale className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Nenhum produto configurado</p>
        <p className="text-sm">
          Configure produtos para aparecer no self service nas configurações do produto.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => {
        const isWeightProduct = product.product_type === "kg" || product.product_type === "weight";
        const value = calculateValue(product);

        return (
          <Card
            key={product.id}
            className={cn(
              "cursor-pointer transition-all hover:ring-2 hover:ring-primary",
              isSubmitting && "opacity-50 pointer-events-none"
            )}
            onClick={() => onProductSelect(product)}
          >
            <CardContent className="p-0">
              {/* Product Image */}
              <div className="relative aspect-square bg-muted">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Weight badge */}
                {isWeightProduct && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 gap-1"
                  >
                    <Scale className="h-3 w-3" />
                    Por kg
                  </Badge>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3 space-y-2">
                <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(product.price)}
                    {isWeightProduct && "/kg"}
                  </span>
                </div>

                {/* Calculated value for weight products */}
                {isWeightProduct && currentWeight > 0 && (
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(value)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {currentWeight.toFixed(3)} kg
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {isSubmitting && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Lançando produto...</span>
          </div>
        </div>
      )}
    </div>
  );
}
