import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWeatherMenu } from '@/hooks/useWeatherMenu';
import { Cloud, Sun, CloudRain, Thermometer, Wind, Droplets, Snowflake, Leaf, Flower2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface WeatherMenuConfigProps {
  productId: string;
  productName: string;
}

type WeatherTag = 'sunny' | 'cloudy' | 'rainy' | 'cold' | 'hot' | 'humid' | 'windy';
type IdealCondition = 'verao' | 'inverno' | 'primavera' | 'outono' | 'all';

const WEATHER_OPTIONS: { value: WeatherTag; label: string; icon: React.ReactNode }[] = [
  { value: 'sunny', label: 'Ensolarado', icon: <Sun className="h-4 w-4 text-yellow-500" /> },
  { value: 'cloudy', label: 'Nublado', icon: <Cloud className="h-4 w-4 text-gray-500" /> },
  { value: 'rainy', label: 'Chuvoso', icon: <CloudRain className="h-4 w-4 text-blue-500" /> },
  { value: 'cold', label: 'Frio', icon: <Snowflake className="h-4 w-4 text-cyan-500" /> },
  { value: 'hot', label: 'Quente', icon: <Thermometer className="h-4 w-4 text-red-500" /> },
  { value: 'humid', label: 'Úmido', icon: <Droplets className="h-4 w-4 text-blue-400" /> },
  { value: 'windy', label: 'Ventoso', icon: <Wind className="h-4 w-4 text-teal-500" /> },
];

const SEASON_OPTIONS: { value: IdealCondition; label: string; icon: React.ReactNode }[] = [
  { value: 'verao', label: 'Verão', icon: <Sun className="h-4 w-4 text-orange-500" /> },
  { value: 'inverno', label: 'Inverno', icon: <Snowflake className="h-4 w-4 text-blue-500" /> },
  { value: 'primavera', label: 'Primavera', icon: <Flower2 className="h-4 w-4 text-pink-500" /> },
  { value: 'outono', label: 'Outono', icon: <Leaf className="h-4 w-4 text-amber-600" /> },
  { value: 'all', label: 'Todas', icon: <Sparkles className="h-4 w-4 text-purple-500" /> },
];

export function WeatherMenuConfig({ productId, productName }: WeatherMenuConfigProps) {
  const { getProductTags, setProductWeatherTags } = useWeatherMenu();
  
  const existingTags = getProductTags(productId);
  
  const [selectedWeather, setSelectedWeather] = useState<WeatherTag[]>(
    (existingTags?.weather_tags || []) as WeatherTag[]
  );
  const [selectedSeasons, setSelectedSeasons] = useState<IdealCondition[]>(
    (existingTags?.ideal_conditions || []) as IdealCondition[]
  );
  const [minTemp, setMinTemp] = useState<string>(existingTags?.temperature_min?.toString() || '');
  const [maxTemp, setMaxTemp] = useState<string>(existingTags?.temperature_max?.toString() || '');

  const toggleWeather = (weather: WeatherTag) => {
    setSelectedWeather(prev =>
      prev.includes(weather)
        ? prev.filter(w => w !== weather)
        : [...prev, weather]
    );
  };

  const toggleSeason = (season: IdealCondition) => {
    setSelectedSeasons(prev =>
      prev.includes(season)
        ? prev.filter(s => s !== season)
        : [...prev, season]
    );
  };

  const handleSave = async () => {
    try {
      await setProductWeatherTags.mutateAsync({
        product_id: productId,
        weather_tags: selectedWeather,
        ideal_conditions: selectedSeasons,
        temperature_min: minTemp ? parseFloat(minTemp) : undefined,
        temperature_max: maxTemp ? parseFloat(maxTemp) : undefined,
      });
      toast.success('Configurações de clima salvas');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Clima & Estação
        </CardTitle>
        <CardDescription>
          Configure quando "{productName}" deve ser destacado no menu
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weather Conditions */}
        <div className="space-y-3">
          <Label>Condições Climáticas</Label>
          <div className="flex flex-wrap gap-2">
            {WEATHER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={selectedWeather.includes(option.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleWeather(option.value)}
                className="gap-2"
              >
                {option.icon}
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Seasons */}
        <div className="space-y-3">
          <Label>Estações do Ano (Condições Ideais)</Label>
          <div className="flex flex-wrap gap-2">
            {SEASON_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={selectedSeasons.includes(option.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSeason(option.value)}
                className="gap-2"
              >
                {option.icon}
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Temperature Range */}
        <div className="space-y-3">
          <Label>Faixa de Temperatura (°C)</Label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Mín"
                value={minTemp}
                onChange={(e) => setMinTemp(e.target.value)}
              />
            </div>
            <span className="text-muted-foreground">até</span>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Máx"
                value={maxTemp}
                onChange={(e) => setMaxTemp(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={setProductWeatherTags.isPending}
          className="w-full"
        >
          {setProductWeatherTags.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}

export function WeatherSuggestionsList() {
  const { suggestions, generateSuggestions, isLoading } = useWeatherMenu();

  const handleGenerate = async () => {
    try {
      await generateSuggestions.mutateAsync();
      toast.success('Sugestões geradas');
    } catch (error) {
      toast.error('Erro ao gerar sugestões');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sugestões do Dia
          </CardTitle>
          <CardDescription>
            Produtos recomendados baseado no clima atual
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          onClick={handleGenerate}
          disabled={generateSuggestions.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateSuggestions.isPending ? 'animate-spin' : ''}`} />
          Gerar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Cloud className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma sugestão disponível</p>
            <p className="text-sm">Clique em "Gerar" para criar sugestões</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {suggestion.weather_condition}
                      {suggestion.temperature_celsius && ` ${suggestion.temperature_celsius}°C`}
                    </Badge>
                    {suggestion.humidity_percent && (
                      <span className="text-sm text-muted-foreground">
                        Umidade: {suggestion.humidity_percent}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{suggestion.ai_reasoning}</p>
                </div>
                <Badge variant={suggestion.status === 'applied' ? 'default' : 'secondary'}>
                  {suggestion.status === 'applied' ? 'Aplicado' : 'Pendente'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}