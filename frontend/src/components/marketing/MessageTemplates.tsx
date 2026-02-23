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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Copy, Check, Sparkles, Gift, Users, Clock, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  content: string;
  variables: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'promo-flash',
    name: 'Promoção Relâmpago',
    description: 'Para ofertas com tempo limitado',
    category: 'Promoção',
    icon: <Clock className="w-4 h-4 text-orange-500" />,
    content: '⚡ PROMOÇÃO RELÂMPAGO! ⚡\n\n🔥 {produto} por apenas R$ {preco}!\n\n⏰ Válido somente HOJE!\n\n📲 Peça agora: {link}',
    variables: ['produto', 'preco', 'link'],
  },
  {
    id: 'novo-produto',
    name: 'Lançamento',
    description: 'Anunciar novos produtos',
    category: 'Novidade',
    icon: <Sparkles className="w-4 h-4 text-purple-500" />,
    content: '✨ NOVIDADE NA CASA! ✨\n\nApresentamos: {produto}!\n\n{descricao}\n\n💰 R$ {preco}\n\n📲 Experimente: {link}',
    variables: ['produto', 'descricao', 'preco', 'link'],
  },
  {
    id: 'fidelidade',
    name: 'Cliente VIP',
    description: 'Para clientes especiais',
    category: 'Fidelidade',
    icon: <Star className="w-4 h-4 text-yellow-500" />,
    content: '⭐ CLIENTE VIP! ⭐\n\nOlá {nome}! Como cliente especial, você tem desconto exclusivo:\n\n🎁 {desconto}% OFF em {produto}!\n\n📲 Use o cupom: {cupom}',
    variables: ['nome', 'desconto', 'produto', 'cupom'],
  },
  {
    id: 'reativacao',
    name: 'Sentimos sua Falta',
    description: 'Reativar clientes inativos',
    category: 'Reativação',
    icon: <Users className="w-4 h-4 text-blue-500" />,
    content: '💚 Sentimos sua falta, {nome}!\n\nFaz tempo que não vem nos visitar... 😢\n\nPra você voltar com tudo, temos um presente:\n\n🎁 {oferta}\n\n📲 Peça agora: {link}',
    variables: ['nome', 'oferta', 'link'],
  },
  {
    id: 'combo',
    name: 'Combo Especial',
    description: 'Promover combos e kits',
    category: 'Combo',
    icon: <Gift className="w-4 h-4 text-pink-500" />,
    content: '🍔 COMBO IRRESISTÍVEL! 🍟\n\n{combo} por apenas R$ {preco}!\n\n✅ {item1}\n✅ {item2}\n✅ {item3}\n\n💰 Economize R$ {economia}!\n\n📲 Peça: {link}',
    variables: ['combo', 'preco', 'item1', 'item2', 'item3', 'economia', 'link'],
  },
];

interface MessageTemplatesProps {
  onSelect?: (content: string) => void;
}

export function MessageTemplates({ onSelect }: MessageTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (template: Template) => {
    await navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    toast.success('Template copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelect = (template: Template) => {
    if (onSelect) {
      onSelect(template.content);
      setOpen(false);
    } else {
      handleCopy(template);
    }
  };

  const categories = [...new Set(TEMPLATES.map((t) => t.category))];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Templates de Mensagens
          </DialogTitle>
          <DialogDescription>
            Escolha um template pronto para suas campanhas
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="grid gap-3">
                  {TEMPLATES.filter((t) => t.category === category).map(
                    (template) => (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => handleSelect(template)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {template.icon}
                              <CardTitle className="text-sm">
                                {template.name}
                              </CardTitle>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(template);
                              }}
                            >
                              {copiedId === template.id ? (
                                <Check className="w-4 h-4 text-success" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                          <CardDescription className="text-xs">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap font-sans">
                            {template.content}
                          </pre>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.variables.map((v) => (
                              <Badge
                                key={v}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {`{${v}}`}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
