import { ArrowLeft, Wine, ShoppingCart, Sparkles, MapPin, Grape, Thermometer, Clock, Users, XCircle, CheckCircle2, Info, BookOpen, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WineProduct } from '../types';
import { cn } from '@/lib/utils';

interface WineDetailScreenProps {
  wine: WineProduct;
  isSommelierPick?: boolean;
  onSeePairings: () => void;
  onBack: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Helper to get tag values by type
function getTagValues(tags: { tag_type: string; tag_value: string }[], type: string): string[] {
  return tags.filter(t => t.tag_type === type).map(t => t.tag_value);
}

function getTagValue(tags: { tag_type: string; tag_value: string }[], type: string): string | undefined {
  return tags.find(t => t.tag_type === type)?.tag_value;
}

// Format tag value for display
function formatTagValue(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Suggestive phrases for when user selects a wine
const SUGGESTIVE_PHRASES = {
  sommelierPick: [
    "Excelente escolha! Este é um dos favoritos do nosso Sommelier. 🍷",
    "Ótima seleção! O Sommelier preparou uma harmonização especial para este vinho.",
    "Perfeito! Este vinho foi cuidadosamente selecionado pelo nosso Sommelier.",
  ],
  regular: [
    "Ótima escolha! Vamos encontrar a harmonização perfeita para você.",
    "Excelente seleção! Que tal descobrir os acompanhamentos ideais?",
    "Escolha sofisticada! Preparamos sugestões especiais para este vinho.",
  ],
};

export function WineDetailScreen({ wine, isSommelierPick = false, onSeePairings, onBack }: WineDetailScreenProps) {
  const [showSuggestiveMessage, setShowSuggestiveMessage] = useState(true);
  const [suggestivePhrase, setSuggestivePhrase] = useState('');

  // Set random suggestive phrase on mount
  useEffect(() => {
    const phrases = isSommelierPick ? SUGGESTIVE_PHRASES.sommelierPick : SUGGESTIVE_PHRASES.regular;
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    setSuggestivePhrase(randomPhrase);
    
    // Hide message after 5 seconds
    const timer = setTimeout(() => setShowSuggestiveMessage(false), 5000);
    return () => clearTimeout(timer);
  }, [isSommelierPick]);

  const tags = wine.tags || [];
  
  // Extract all wine info from tags
  const tipo = getTagValue(tags, 'tipo');
  const uva = getTagValue(tags, 'uva');
  const origem = getTagValue(tags, 'origem');
  const corpo = getTagValue(tags, 'corpo');
  const docura = getTagValue(tags, 'docura');
  const taninos = getTagValue(tags, 'taninos');
  const acidez = getTagValue(tags, 'acidez');
  const fabricante = getTagValue(tags, 'fabricante');
  const ano = getTagValue(tags, 'ano');
  const temperatura = getTagValue(tags, 'temperatura');
  const decantacao = getTagValue(tags, 'decantacao');
  const descricaoSensorial = getTagValue(tags, 'descricao_sensorial');
  const historiaVinho = getTagValue(tags, 'historia_vinho');
  const notasSommelier = getTagValue(tags, 'notas_sommelier');
  
  const aromas = getTagValues(tags, 'aroma');
  const harmonizaCom = getTagValues(tags, 'harmoniza_com');
  const evitarCom = getTagValues(tags, 'evitar_com');
  const ocasioes = getTagValues(tags, 'ocasiao');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-950/30 via-background to-background">
      {/* Suggestive Message Toast */}
      {showSuggestiveMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gradient-to-r from-purple-900/95 to-amber-900/95 backdrop-blur-sm rounded-xl px-6 py-4 border border-amber-500/30 shadow-neon-mixed max-w-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-amber-600 flex items-center justify-center flex-shrink-0">
                <Wine className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-white font-medium">{suggestivePhrase}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-purple-500/20 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 pb-40 max-w-lg mx-auto w-full">
          {/* Wine Image */}
          <Card className="w-full overflow-hidden bg-gradient-to-br from-card to-purple-950/50 border-purple-500/20 mb-6 animate-fade-in">
            <div className="aspect-[4/3] bg-gradient-to-br from-purple-900/30 to-slate-900/50 overflow-hidden relative">
              {wine.image_url ? (
                <img
                  src={wine.image_url}
                  alt={wine.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Wine className="w-24 h-24 text-purple-500/30" />
                </div>
              )}
              {wine.badge && (
                <Badge className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-amber-600 border-0 text-white shadow-lg">
                  ✨ {wine.badge}
                </Badge>
              )}
              {tipo && (
                <Badge className="absolute top-4 right-4 bg-purple-600/80 border-0 text-white">
                  {formatTagValue(tipo)}
                </Badge>
              )}
            </div>
          </Card>

          {/* Wine Name & Price */}
          <div className="text-center mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
              {wine.name}
            </h2>
            {fabricante && (
              <p className="text-muted-foreground text-sm mb-2">{fabricante} {ano && `• ${ano}`}</p>
            )}
            <p className="text-3xl font-bold text-gradient-primary">
              {formatCurrency(wine.price)}
            </p>
          </div>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            {origem && (
              <Badge variant="outline" className="bg-purple-600/10 border-purple-500/30">
                <MapPin className="w-3 h-3 mr-1" />
                {formatTagValue(origem)}
              </Badge>
            )}
            {uva && (
              <Badge variant="outline" className="bg-amber-600/10 border-amber-500/30">
                <Grape className="w-3 h-3 mr-1" />
                {formatTagValue(uva)}
              </Badge>
            )}
            {corpo && (
              <Badge variant="outline" className="bg-purple-600/10 border-purple-500/30">
                Corpo {formatTagValue(corpo)}
              </Badge>
            )}
            {docura && (
              <Badge variant="outline" className="bg-amber-600/10 border-amber-500/30">
                {formatTagValue(docura)}
              </Badge>
            )}
          </div>

          {/* Sensory Description */}
          {(descricaoSensorial || wine.sensoryProfile || wine.description) && (
            <Card className="mb-6 bg-gradient-to-br from-purple-950/30 to-card border-purple-500/20 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-purple-400" />
                  <h3 className="font-semibold text-white">Sobre o Vinho</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {descricaoSensorial || wine.sensoryProfile || wine.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Characteristics */}
          {(taninos || acidez || aromas.length > 0) && (
            <Card className="mb-6 bg-gradient-to-br from-purple-950/30 to-card border-purple-500/20 animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">Características</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {taninos && (
                    <div>
                      <span className="text-muted-foreground">Taninos:</span>
                      <span className="text-white ml-2">{formatTagValue(taninos)}</span>
                    </div>
                  )}
                  {acidez && (
                    <div>
                      <span className="text-muted-foreground">Acidez:</span>
                      <span className="text-white ml-2">{formatTagValue(acidez)}</span>
                    </div>
                  )}
                </div>
                {aromas.length > 0 && (
                  <div className="mt-3">
                    <span className="text-muted-foreground text-sm">Aromas: </span>
                    <span className="text-white text-sm">
                      {aromas.map(formatTagValue).join(', ')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Service Info */}
          {(temperatura || decantacao) && (
            <Card className="mb-6 bg-gradient-to-br from-purple-950/30 to-card border-purple-500/20 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">Como Servir</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  {temperatura && (
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-amber-400" />
                      <span className="text-muted-foreground">Temperatura:</span>
                      <span className="text-white">{temperatura}</span>
                    </div>
                  )}
                  {decantacao && decantacao !== 'desnecessario' && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-muted-foreground">Decantação:</span>
                      <span className="text-white">{decantacao}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Harmonization - What pairs well */}
          {harmonizaCom.length > 0 && (
            <Card className="mb-6 bg-gradient-to-br from-green-950/30 to-card border-green-500/20 animate-fade-in" style={{ animationDelay: '0.35s' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-white">Harmoniza Bem Com</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {harmonizaCom.map((item, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="bg-green-600/20 text-green-300 border-green-500/30"
                    >
                      {formatTagValue(item)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* What to avoid */}
          {evitarCom.length > 0 && (
            <Card className="mb-6 bg-gradient-to-br from-red-950/30 to-card border-red-500/20 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <h3 className="font-semibold text-white">Evite Combinar Com</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {evitarCom.map((item, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="bg-red-600/20 text-red-300 border-red-500/30"
                    >
                      {formatTagValue(item)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Occasions */}
          {ocasioes.length > 0 && (
            <Card className="mb-6 bg-gradient-to-br from-purple-950/30 to-card border-purple-500/20 animate-fade-in" style={{ animationDelay: '0.45s' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-white">Ideal Para</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ocasioes.map((item, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="bg-purple-600/20 text-purple-300 border-purple-500/30"
                    >
                      {formatTagValue(item)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wine History */}
          {historiaVinho && (
            <Card className="mb-6 bg-gradient-to-br from-amber-950/30 to-card border-amber-500/20 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-white">História do Vinho</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {historiaVinho}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sommelier Notes */}
          {notasSommelier && (
            <Card className="mb-6 bg-gradient-to-br from-purple-950/30 to-card border-purple-500/20 animate-fade-in" style={{ animationDelay: '0.55s' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-white">Dica do Sommelier</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed italic">
                  "{notasSommelier}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sommelier signature */}
          <div className="flex items-center justify-center gap-4 text-muted-foreground/50 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-500/50" />
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm">Sugestão do Sommelier Virtual</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
        </div>
      </ScrollArea>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-purple-500/20 p-4">
        <div className="max-w-lg mx-auto">
          <Button
            size="lg"
            onClick={onSeePairings}
            className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-semibold py-6 rounded-xl shadow-neon-mixed"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Ver Harmonização e Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
}
