import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Instagram, MessageSquare, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostPreviewModalProps {
  productName: string;
  productImage?: string;
  productPrice?: number;
  salePrice?: number;
  caption?: string;
  hashtags?: string[];
  whatsappMessage?: string;
  trigger?: React.ReactNode;
}

export function PostPreviewModal({
  productName,
  productImage,
  productPrice,
  salePrice,
  caption,
  hashtags,
  whatsappMessage,
  trigger,
}: PostPreviewModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Preview do Post
          </DialogTitle>
          <DialogDescription>
            Veja como o conteúdo aparecerá nas redes sociais
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="instagram" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instagram" className="gap-2">
              <Instagram className="w-4 h-4" />
              Instagram
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instagram" className="mt-4">
            {/* Instagram Preview */}
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
              {/* Header */}
              <div className="flex items-center gap-3 p-3 border-b">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500" />
                <span className="font-semibold text-sm text-foreground">sua_loja</span>
              </div>

              {/* Image */}
              {productImage ? (
                <img
                  src={productImage}
                  alt={productName}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">Sem imagem</span>
                </div>
              )}

              {/* Caption */}
              <div className="p-3 space-y-2">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">sua_loja</span>{' '}
                  {caption || 'Descrição do produto...'}
                </p>
                {hashtags && hashtags.length > 0 && (
                  <p className="text-sm text-blue-500">
                    {hashtags.map((h) => `#${h}`).join(' ')}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-4">
            {/* WhatsApp Preview */}
            <div className="bg-[#e5ddd5] dark:bg-[#0b141a] p-4 rounded-lg min-h-[300px]">
              {/* Message Bubble */}
              <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg p-3 max-w-[85%] ml-auto shadow-sm">
                {productImage && (
                  <img
                    src={productImage}
                    alt={productName}
                    className="w-full rounded-lg mb-2"
                  />
                )}
                <p className="text-sm text-zinc-900 dark:text-white whitespace-pre-wrap">
                  {whatsappMessage || 'Mensagem do WhatsApp...'}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {new Date().toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <svg
                    className="w-4 h-4 text-blue-500"
                    viewBox="0 0 16 15"
                    fill="currentColor"
                  >
                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.064-.512z" />
                  </svg>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Price Info */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="font-medium">{productName}</span>
          <div className="flex items-center gap-2">
            {salePrice ? (
              <>
                <span className="text-sm line-through text-muted-foreground">
                  R$ {productPrice?.toFixed(2)}
                </span>
                <Badge variant="default" className="bg-success">
                  R$ {salePrice.toFixed(2)}
                </Badge>
              </>
            ) : (
              <span className="font-semibold">
                R$ {productPrice?.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
