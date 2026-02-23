// Wine Info Card with Grape, Country (with flag), and Region prominently displayed
import { Wine, MapPin, Flag, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WINE_COUNTRIES, GRAPE_TYPES } from '../types/wineTypes';

interface WineInfoCardProps {
  wine: {
    id: string;
    name: string;
    price: number;
    image_url?: string | null;
    badge?: string;
    aiScore?: number;
    aiReason?: string;
    aiTip?: string;
    grape?: string;
    country?: string;
    region?: string;
  };
  rank?: number;
  onSelect: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Get country flag emoji by name
function getCountryFlag(countryName?: string): string {
  if (!countryName) return '🌍';
  
  const normalizedName = countryName.toLowerCase().trim();
  
  // Map common country names to flags
  const flagMap: Record<string, string> = {
    'brasil': '🇧🇷',
    'brazil': '🇧🇷',
    'argentina': '🇦🇷',
    'chile': '🇨🇱',
    'frança': '🇫🇷',
    'france': '🇫🇷',
    'itália': '🇮🇹',
    'italy': '🇮🇹',
    'espanha': '🇪🇸',
    'spain': '🇪🇸',
    'portugal': '🇵🇹',
    'estados unidos': '🇺🇸',
    'usa': '🇺🇸',
    'united states': '🇺🇸',
    'austrália': '🇦🇺',
    'australia': '🇦🇺',
    'áfrica do sul': '🇿🇦',
    'south africa': '🇿🇦',
    'nova zelândia': '🇳🇿',
    'new zealand': '🇳🇿',
    'alemanha': '🇩🇪',
    'germany': '🇩🇪',
    'uruguai': '🇺🇾',
    'uruguay': '🇺🇾',
  };
  
  return flagMap[normalizedName] || '🌍';
}

// Get grape icon
function getGrapeIcon(grapeName?: string): string {
  if (!grapeName) return '🍇';
  
  const normalizedName = grapeName.toLowerCase();
  
  // Red grape varieties
  const redGrapes = ['cabernet', 'merlot', 'malbec', 'pinot noir', 'syrah', 'shiraz', 'carmenere', 'tannat', 'tempranillo', 'sangiovese', 'nebbiolo', 'zinfandel'];
  // White grape varieties  
  const whiteGrapes = ['chardonnay', 'sauvignon', 'riesling', 'moscato', 'pinot grigio', 'gewürztraminer', 'viognier', 'albariño', 'verdejo'];
  
  for (const red of redGrapes) {
    if (normalizedName.includes(red)) return '🍇';
  }
  
  for (const white of whiteGrapes) {
    if (normalizedName.includes(white)) return '🍈';
  }
  
  return '🍇';
}

export function WineInfoCard({ wine, rank, onSelect }: WineInfoCardProps) {
  const isTopPick = rank === 0;
  const countryFlag = getCountryFlag(wine.country);
  const grapeIcon = getGrapeIcon(wine.grape);
  
  return (
    <Card
      onClick={onSelect}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-lg",
        isTopPick 
          ? "bg-gradient-to-br from-purple-900/60 via-purple-800/40 to-amber-900/30 border-purple-400/50 shadow-lg shadow-purple-500/20"
          : "bg-card/50 border-border hover:border-purple-500/50"
      )}
    >
      {/* Ranking badge */}
      {rank !== undefined && (
        <div className={cn(
          "absolute -top-1 -left-1 w-10 h-10 rounded-br-xl flex items-center justify-center font-bold text-lg z-10",
          rank === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black" :
          rank === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-black" :
          rank === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
          "bg-muted text-muted-foreground"
        )}>
          {rank + 1}º
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Wine Image or Icon */}
          <div className={cn(
            "w-20 h-24 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
            isTopPick ? "bg-gradient-to-br from-purple-500/30 to-amber-500/20" : "bg-muted"
          )}>
            {wine.image_url ? (
              <img 
                src={wine.image_url} 
                alt={wine.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <Wine className={cn(
                "w-10 h-10",
                isTopPick ? "text-purple-300" : "text-muted-foreground"
              )} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Wine Name */}
            <h3 className="font-bold text-white text-lg mb-1 line-clamp-2">{wine.name}</h3>
            
            {/* Badge */}
            {wine.badge && (
              <Badge className="bg-yellow-500/20 text-yellow-300 text-xs mb-2">
                ✨ {wine.badge}
              </Badge>
            )}
            
            {/* GRAPE, COUNTRY, REGION - IN HIGHLIGHT */}
            <div className="space-y-1.5 mb-3">
              {/* Grape */}
              {wine.grape && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">{grapeIcon}</span>
                  <span className="text-sm font-medium text-amber-300">{wine.grape}</span>
                </div>
              )}
              
              {/* Country with Flag */}
              {wine.country && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">{countryFlag}</span>
                  <span className="text-sm font-medium text-white">{wine.country}</span>
                </div>
              )}
              
              {/* Region */}
              {wine.region && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-300">{wine.region}</span>
                </div>
              )}
            </div>
            
            {/* AI Score */}
            {wine.aiScore !== undefined && (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      wine.aiScore >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-400" :
                      wine.aiScore >= 60 ? "bg-gradient-to-r from-yellow-500 to-amber-400" :
                      "bg-gradient-to-r from-purple-500 to-pink-400"
                    )}
                    style={{ width: `${wine.aiScore}%` }}
                  />
                </div>
                <span className={cn(
                  "text-sm font-bold",
                  wine.aiScore >= 80 ? "text-green-400" :
                  wine.aiScore >= 60 ? "text-yellow-400" :
                  "text-purple-400"
                )}>
                  {wine.aiScore}%
                </span>
              </div>
            )}
            
            {/* AI Reason */}
            {wine.aiReason && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {wine.aiReason}
              </p>
            )}
            
            {/* AI Tip */}
            {wine.aiTip && (
              <p className="text-xs text-purple-300 italic">
                💡 {wine.aiTip}
              </p>
            )}
          </div>
        </div>
        
        {/* Price */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-500/20">
          <span className="text-xs text-muted-foreground">Clique para ver detalhes</span>
          <span className="text-xl font-bold text-gradient-primary">
            {formatCurrency(wine.price)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
