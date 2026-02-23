import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useReviews } from '@/hooks/useReviews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function Reviews() {
  const { reviews, stats, isLoading, replyToReview, isReplying } = useReviews();
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; reviewId: string; currentReply: string }>({
    open: false,
    reviewId: '',
    currentReply: '',
  });
  const [replyText, setReplyText] = useState('');

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`}
      />
    ));
  };

  const handleReply = () => {
    replyToReview({ reviewId: replyDialog.reviewId, reply: replyText });
    setReplyDialog({ open: false, reviewId: '', currentReply: '' });
    setReplyText('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Avaliações</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Avaliações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.average.toFixed(1)}</span>
                <div className="flex">{renderStars(Math.round(stats.average))}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                5 Estrelas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.byRating.find(r => r.rating === 5)?.count || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                1-2 Estrelas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {(stats.byRating.find(r => r.rating === 1)?.count || 0) +
                  (stats.byRating.find(r => r.rating === 2)?.count || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : reviews.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma avaliação ainda.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            Pedido #{review.orders?.order_number}
                          </span>
                          <span className="text-muted-foreground">
                            {review.orders?.customer_name || 'Cliente'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(review.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {review.comment && (
                      <p className="text-sm">{review.comment}</p>
                    )}

                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {review.food_rating && (
                        <span>Comida: {review.food_rating}★</span>
                      )}
                      {review.delivery_rating && (
                        <span>Entrega: {review.delivery_rating}★</span>
                      )}
                    </div>

                    {review.reply ? (
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Sua resposta:</p>
                        <p className="text-sm">{review.reply}</p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyDialog({ open: true, reviewId: review.id, currentReply: '' });
                          setReplyText('');
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Responder
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reply Dialog */}
      <Dialog open={replyDialog.open} onOpenChange={(open) => setReplyDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Avaliação</DialogTitle>
          </DialogHeader>
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escreva sua resposta..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(prev => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button onClick={handleReply} disabled={!replyText.trim() || isReplying}>
              Enviar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
