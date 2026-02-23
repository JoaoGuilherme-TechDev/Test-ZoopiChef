import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Wine, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WineProduct } from '../types';
import { cn } from '@/lib/utils';

interface WineCarouselProps {
  wines: WineProduct[];
  onSelectWine: (wine: WineProduct) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Helper to get wine type from tags (prioritizes espumante over rose)
function getWineType(wine: WineProduct): string {
  const tipos = wine.tags.filter(t => t.tag_type === 'tipo').map(t => t.tag_value);
  
  // Priority order for wines with multiple types
  const priorityOrder = ['espumante', 'tinto', 'branco', 'rose', 'sobremesa', 'fortificado'];
  
  for (const priority of priorityOrder) {
    if (tipos.includes(priority)) {
      return priority;
    }
  }
  
  // If has any tipo, return the first one
  if (tipos.length > 0) {
    return tipos[0];
  }
  
  return 'outros';
}

// Check if wine is sommelier pick
function isSommelierPick(wine: WineProduct): boolean {
  return wine.tags.some(t => t.tag_type === 'destaque' && t.tag_value === 'sommelier_pick');
}

// Define type labels and icons with fixed order
const TYPE_CONFIG: { key: string; label: string; icon: string }[] = [
  { key: 'tinto', label: 'Tintos', icon: '🍷' },
  { key: 'branco', label: 'Brancos', icon: '🥂' },
  { key: 'rose', label: 'Rosés', icon: '🌸' },
  { key: 'espumante', label: 'Espumantes', icon: '🍾' },
  { key: 'sobremesa', label: 'Vinhos de Sobremesa', icon: '🍯' },
  { key: 'fortificado', label: 'Fortificados', icon: '🥃' },
  { key: 'outros', label: 'Outros Vinhos', icon: '🍇' },
];

export function WineCarousel({ wines, onSelectWine }: WineCarouselProps) {
  // Separate sommelier picks
  const sommelierPicks = wines.filter(isSommelierPick);
  
  // Group all wines by type
  const winesByType: Record<string, WineProduct[]> = {};
  
  wines.forEach(wine => {
    const tipo = getWineType(wine);
    if (!winesByType[tipo]) {
      winesByType[tipo] = [];
    }
    winesByType[tipo].push(wine);
  });
  
  // Get ordered sections (only those that have wines)
  const orderedSections = TYPE_CONFIG.filter(config => 
    winesByType[config.key] && winesByType[config.key].length > 0
  );

  return (
    <div className="space-y-8">
      {/* Sommelier Picks Section - Always show first if exists */}
      {sommelierPicks.length > 0 && (
        <CarouselSection
          key="sommelier_pick"
          title="Escolha do Enólogo"
          icon="🍷"
          wines={sommelierPicks}
          onSelectWine={onSelectWine}
          delay={0}
          highlight
        />
      )}
      
      {/* "Nossa Carta de Vinhos" - Always show ALL wines */}
      {wines.length > 0 && (
        <CarouselSection
          key="all_wines"
          title="Nossa Carta de Vinhos"
          icon="📜"
          wines={wines}
          onSelectWine={onSelectWine}
          delay={0.1}
          showCount
        />
      )}
      
      {/* Wine Types Sections - Ordered */}
      {orderedSections.map((config, idx) => (
        <CarouselSection
          key={config.key}
          title={config.label}
          icon={config.icon}
          wines={winesByType[config.key]}
          onSelectWine={onSelectWine}
          delay={(idx + 2) * 0.1}
          showCount
        />
      ))}
    </div>
  );
}

interface CarouselSectionProps {
  title: string;
  icon: string;
  wines: WineProduct[];
  onSelectWine: (wine: WineProduct) => void;
  delay: number;
  highlight?: boolean;
  showCount?: boolean;
}

function CarouselSection({ title, icon, wines, onSelectWine, delay, highlight, showCount }: CarouselSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 280;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="animate-fade-in" style={{ animationDelay: `${delay}s` }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className={cn(
            "text-xl font-bold",
            highlight ? "text-gradient-primary" : "text-white"
          )}>
            {title}
          </h3>
          {highlight && (
            <Sparkles className="w-4 h-4 text-amber-400" />
          )}
          {showCount && (
            <Badge variant="secondary" className="ml-2 bg-purple-600/20 text-purple-300 border-purple-500/30">
              {wines.length} {wines.length === 1 ? 'vinho' : 'vinhos'}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="h-8 w-8 text-muted-foreground hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="h-8 w-8 text-muted-foreground hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2"
      >
        {wines.map((wine) => (
          <WineCard 
            key={wine.id} 
            wine={wine} 
            onSelect={() => onSelectWine(wine)}
            isSommelierPick={isSommelierPick(wine)}
          />
        ))}
      </div>
    </div>
  );
}

interface WineCardProps {
  wine: WineProduct;
  onSelect: () => void;
  isSommelierPick?: boolean;
}

function WineCard({ wine, onSelect, isSommelierPick }: WineCardProps) {
  return (
    <Card
      onClick={onSelect}
      className={cn(
        "min-w-[240px] max-w-[240px] overflow-hidden cursor-pointer transition-all duration-300",
        "bg-gradient-to-br from-card to-purple-950/50 border-purple-500/20",
        "hover:border-purple-400/40 hover:scale-[1.02] hover:shadow-neon-purple",
        "snap-start shrink-0",
        isSommelierPick && "ring-1 ring-amber-500/50"
      )}
    >
      {/* Image */}
      <div className="h-40 bg-gradient-to-br from-purple-900/30 to-slate-900/50 overflow-hidden relative">
        {wine.image_url ? (
          <img
            src={wine.image_url}
            alt={wine.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Wine className="w-12 h-12 text-purple-500/30" />
          </div>
        )}
        {wine.badge && (
          <Badge className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-amber-600 border-0 text-white text-xs shadow-lg">
            {wine.badge}
          </Badge>
        )}
        {isSommelierPick && (
          <div className="absolute top-2 right-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Name */}
        <h4 className="font-semibold text-white line-clamp-2 mb-2">{wine.name}</h4>

        {/* Sensory Profile */}
        {wine.sensoryProfile && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
            {wine.sensoryProfile}
          </p>
        )}

        {/* Price */}
        <p className="text-lg font-bold text-gradient-primary">
          {formatCurrency(wine.price)}
        </p>
      </CardContent>
    </Card>
  );
}
