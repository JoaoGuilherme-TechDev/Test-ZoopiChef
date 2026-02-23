import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ArticleFeedbackProps {
  articleId: string;
  onFeedback?: (articleId: string, helpful: boolean, comment?: string) => void;
  className?: string;
}

export function ArticleFeedback({ articleId, onFeedback, className }: ArticleFeedbackProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = (isHelpful: boolean) => {
    setFeedback(isHelpful ? 'helpful' : 'not-helpful');
    if (!isHelpful) {
      setShowComment(true);
    } else {
      submitFeedback(isHelpful);
    }
  };

  const submitFeedback = (isHelpful: boolean, feedbackComment?: string) => {
    onFeedback?.(articleId, isHelpful, feedbackComment);
    setSubmitted(true);
    toast.success('Obrigado pelo feedback!');
  };

  const handleSubmitComment = () => {
    submitFeedback(false, comment);
    setShowComment(false);
  };

  if (submitted) {
    return (
      <div className={cn("text-center py-4 animate-in fade-in duration-300", className)}>
        <p className="text-sm text-muted-foreground">
          ✅ Obrigado pelo seu feedback!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Este artigo foi útil?
        </p>
        <div className="flex gap-2">
          <Button
            variant={feedback === 'helpful' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFeedback(true)}
            className="gap-2"
          >
            <ThumbsUp className="w-4 h-4" />
            Sim
          </Button>
          <Button
            variant={feedback === 'not-helpful' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => handleFeedback(false)}
            className="gap-2"
          >
            <ThumbsDown className="w-4 h-4" />
            Não
          </Button>
        </div>
      </div>

      {showComment && (
        <div className="space-y-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>Como podemos melhorar este artigo?</span>
          </div>
          <Textarea
            placeholder="Deixe seu comentário..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowComment(false);
                setFeedback(null);
              }}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSubmitComment}>
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
