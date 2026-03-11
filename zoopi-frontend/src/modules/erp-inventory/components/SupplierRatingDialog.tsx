import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { useSupplierRatings } from '../hooks/useSupplierRatings';

interface SupplierRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierName: string;
  purchaseEntryId?: string;
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= (hover || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function SupplierRatingDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  purchaseEntryId,
}: SupplierRatingDialogProps) {
  const { createRating } = useSupplierRatings();
  const [rating, setRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [priceRating, setPriceRating] = useState(0);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) return;

    await createRating.mutateAsync({
      supplier_id: supplierId,
      purchase_entry_id: purchaseEntryId || null,
      rating,
      delivery_rating: deliveryRating || null,
      quality_rating: qualityRating || null,
      price_rating: priceRating || null,
      notes: notes || null,
      rated_by: null,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setRating(0);
    setDeliveryRating(0);
    setQualityRating(0);
    setPriceRating(0);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Fornecedor: {supplierName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <StarRating
            value={rating}
            onChange={setRating}
            label="Avaliação Geral *"
          />

          <div className="grid grid-cols-3 gap-4">
            <StarRating
              value={deliveryRating}
              onChange={setDeliveryRating}
              label="Entrega"
            />
            <StarRating
              value={qualityRating}
              onChange={setQualityRating}
              label="Qualidade"
            />
            <StarRating
              value={priceRating}
              onChange={setPriceRating}
              label="Preço"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentários sobre o fornecedor..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || createRating.isPending}
            >
              {createRating.isPending ? 'Salvando...' : 'Salvar Avaliação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
