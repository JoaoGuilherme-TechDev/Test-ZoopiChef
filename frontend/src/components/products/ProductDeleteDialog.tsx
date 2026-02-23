import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface ProductDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  onSuccess?: () => void;
}

export function ProductDeleteDialog({
  open,
  onOpenChange,
  productId,
  productName,
  onSuccess,
}: ProductDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const deleteProduct = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);

      // Check if product was ever used in an order
      const { data: orderItems, error: checkError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      if (checkError) throw checkError;

      if (orderItems && orderItems.length > 0) {
        // Product was used - soft delete
        const { error } = await supabase
          .from('products')
          .update({
            active: false,
            deleted_at: new Date().toISOString(),
          })
          .eq('id', productId);

        if (error) throw error;
        return { softDelete: true };
      } else {
        // Product never used - can hard delete (but we do soft delete for safety)
        const { error } = await supabase
          .from('products')
          .update({
            active: false,
            deleted_at: new Date().toISOString(),
          })
          .eq('id', productId);

        if (error) throw error;
        return { softDelete: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (result.softDelete) {
        toast.success('Produto desativado (foi usado em pedidos anteriores)');
      } else {
        toast.success('Produto excluído com sucesso');
      }
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir produto');
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir Produto
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Tem certeza que deseja excluir o produto <strong>{productName}</strong>?
            </p>
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Se o produto já foi usado em pedidos, ele será desativado (não aparecerá no cardápio) 
              mas continuará disponível para histórico.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteProduct.mutate()}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
