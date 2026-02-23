import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeatherSuggestionsList, WeatherMenuConfig } from '@/components/menu/WeatherMenuConfig';
import { useWeatherMenu } from '@/hooks/useWeatherMenu';
import { ArrowLeft, Cloud, Settings, Sparkles } from 'lucide-react';

export default function WeatherMenuPage() {
  const navigate = useNavigate();
  const { weatherTags } = useWeatherMenu();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cloud className="h-6 w-6" />
            Menu por Clima
          </h1>
          <p className="text-muted-foreground">
            Configure produtos para serem destacados baseado no clima
          </p>
        </div>
      </div>

      <Tabs defaultValue="suggestions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suggestions" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Sugestões
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions">
          <WeatherSuggestionsList />
        </TabsContent>

        <TabsContent value="config">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Produtos Configurados</CardTitle>
                <CardDescription>
                  {weatherTags.length} produtos com tags de clima
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weatherTags.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cloud className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum produto configurado</p>
                    <p className="text-sm">Configure produtos na página de edição</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {weatherTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedProductId(tag.product_id)}
                      >
                        <div>
                          <p className="font-medium">Produto ID: {tag.product_id.slice(0, 8)}...</p>
                          <div className="flex gap-1 mt-1">
                            {tag.weather_tags.slice(0, 3).map((w) => (
                              <span key={w} className="text-xs bg-muted px-2 py-0.5 rounded">
                                {w}
                              </span>
                            ))}
                            {tag.weather_tags.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{tag.weather_tags.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {tag.temperature_min}°C - {tag.temperature_max}°C
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedProductId && (
              <WeatherMenuConfig
                productId={selectedProductId}
                productName={`Produto ${selectedProductId.slice(0, 8)}`}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
