import { useState } from 'react';
import { useHelpArticles, useHelpCategories, HelpArticle } from '../hooks/useHelpArticles';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  HelpCircle,
  Search,
  BookOpen,
  Video,
  ExternalLink,
  Building2,
  Package,
  Truck,
  ShoppingBag,
  ChefHat,
  Printer,
  Calculator,
  CreditCard,
  Star,
  Megaphone,
  Sparkles,
  TrendingUp,
  PlayCircle,
  MessageCircle,
} from 'lucide-react';
import { ArticleFeedback } from './ArticleFeedback';
import { VideoTutorials } from './VideoTutorials';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, any> = {
  Building2,
  Package,
  Truck,
  ShoppingBag,
  ChefHat,
  Printer,
  Calculator,
  CreditCard,
  Star,
  Megaphone,
  Sparkles,
  TrendingUp,
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  'primeiros-passos': { label: 'Primeiros Passos', color: 'bg-blue-100 text-blue-700' },
  'pedidos': { label: 'Pedidos', color: 'bg-green-100 text-green-700' },
  'financeiro': { label: 'Financeiro', color: 'bg-orange-100 text-orange-700' },
  'clientes': { label: 'Clientes', color: 'bg-purple-100 text-purple-700' },
  'ia': { label: 'Inteligência Artificial', color: 'bg-pink-100 text-pink-700' },
};

interface HelpCenterAdvancedProps {
  trigger?: React.ReactNode;
}

export function HelpCenterAdvanced({ trigger }: HelpCenterAdvancedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('articles');
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());

  const { data: articles = [], isLoading } = useHelpArticles();
  const { data: categories = [] } = useHelpCategories();

  const handleArticleFeedback = (articleId: string, helpful: boolean, comment?: string) => {
    console.log('Feedback:', { articleId, helpful, comment });
    // TODO: Save feedback to database
  };

  const markAsRead = (articleId: string) => {
    setReadArticles(prev => new Set([...prev, articleId]));
  };

  const getRelatedArticles = (article: HelpArticle): HelpArticle[] => {
    return articles
      .filter(a => a.id !== article.id && a.category === article.category)
      .slice(0, 3);
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const groupedArticles = filteredArticles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = [];
    }
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  const getIconComponent = (iconName: string | null) => {
    if (!iconName || !ICON_MAP[iconName]) return BookOpen;
    return ICON_MAP[iconName];
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="relative">
            <HelpCircle className="w-5 h-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Central de Ajuda
          </SheetTitle>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="articles" className="gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Artigos</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-1.5">
                <PlayCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Vídeos</span>
              </TabsTrigger>
              <TabsTrigger value="support" className="gap-1.5">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Suporte</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {activeTab === 'articles' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-300">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar artigos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  Todos
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {CATEGORY_CONFIG[cat]?.label || cat}
                  </Button>
                ))}
              </div>

              {/* Reading History Badge */}
              {readArticles.size > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  {readArticles.size} artigo(s) lido(s)
                </div>
              )}

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : Object.keys(groupedArticles).length === 0 ? (
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum artigo encontrado</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {Object.entries(groupedArticles).map(([category, categoryArticles]) => (
                    <AccordionItem
                      key={category}
                      value={category}
                      className="border rounded-lg px-4 animate-in slide-in-from-left duration-300"
                    >
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={CATEGORY_CONFIG[category]?.color || 'bg-gray-100'}
                          >
                            {CATEGORY_CONFIG[category]?.label || category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {categoryArticles.length} artigos
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-3">
                          {categoryArticles.map((article) => {
                            const IconComponent = getIconComponent(article.icon);
                            const isRead = readArticles.has(article.id);
                            const isExpanded = expandedArticle === article.id;
                            const related = getRelatedArticles(article);
                            
                            return (
                              <div
                                key={article.id}
                                className={cn(
                                  "p-3 rounded-lg transition-all duration-300 cursor-pointer",
                                  isRead ? "bg-primary/5 border border-primary/20" : "bg-muted/50 hover:bg-muted",
                                  isExpanded && "ring-2 ring-primary/30"
                                )}
                                onClick={() => {
                                  setExpandedArticle(isExpanded ? null : article.id);
                                  markAsRead(article.id);
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <IconComponent className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-sm text-foreground">
                                        {article.title}
                                      </h4>
                                      {isRead && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          Lido
                                        </Badge>
                                      )}
                                    </div>
                                    <p className={cn(
                                      "text-xs text-muted-foreground mt-1",
                                      !isExpanded && "line-clamp-2"
                                    )}>
                                      {article.content}
                                    </p>
                                    
                                    {isExpanded && (
                                      <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {article.video_url && (
                                          <a
                                            href={article.video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Video className="w-3 h-3" />
                                            Ver vídeo tutorial
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        )}
                                        
                                        {/* Related Articles */}
                                        {related.length > 0 && (
                                          <div className="pt-3 border-t border-border/50">
                                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                              Artigos relacionados:
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                              {related.map(r => (
                                                <Badge
                                                  key={r.id}
                                                  variant="secondary"
                                                  className="text-[10px] cursor-pointer hover:bg-primary/20"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedArticle(r.id);
                                                    markAsRead(r.id);
                                                  }}
                                                >
                                                  {r.title}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Article Feedback */}
                                        <div className="pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                                          <ArticleFeedback
                                            articleId={article.id}
                                            onFeedback={handleArticleFeedback}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    
                                    {!isExpanded && article.video_url && (
                                      <div className="flex items-center gap-1 text-xs text-primary mt-2">
                                        <Video className="w-3 h-3" />
                                        Contém vídeo
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="p-4 animate-in fade-in duration-300">
              <VideoTutorials />
            </div>
          )}

          {activeTab === 'support' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-300">
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 mx-auto text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">Precisa de ajuda?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Nossa equipe está pronta para ajudar você com qualquer dúvida.
                </p>
                <div className="space-y-3">
                  <Button className="w-full gap-2" asChild>
                    <a href="mailto:suporte@exemplo.com">
                      <MessageCircle className="w-4 h-4" />
                      Enviar mensagem
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <a href="/manual" target="_blank">
                      <BookOpen className="w-4 h-4" />
                      Manual completo
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Precisa de mais ajuda?{' '}
            <a href="/manual" className="text-primary hover:underline">
              Acesse o manual completo
            </a>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
