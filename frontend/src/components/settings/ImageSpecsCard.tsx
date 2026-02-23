/**
 * Componente para exibir especificações de imagens por dispositivo
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Tablet, Tv, Image, FileImage, Film } from 'lucide-react';
import { DEVICE_IMAGE_SPECS, formatDimensions, type DeviceSpecs, type ImageSpecification } from '@/lib/imageSpecs';

function SpecItem({ spec, icon }: { spec: ImageSpecification; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-sm">{spec.name}</h4>
          <Badge variant="secondary" className="text-xs">
            {spec.aspectRatio}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{spec.description}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <code className="text-xs bg-background px-2 py-1 rounded border">
            {formatDimensions(spec)}
          </code>
          <span className="text-xs text-muted-foreground">
            Máx: {spec.maxSizeMB}MB
          </span>
          <span className="text-xs text-muted-foreground">
            {spec.recommendedFormats.join(', ')}
          </span>
        </div>
      </div>
    </div>
  );
}

function DeviceSpecsList({ specs }: { specs: DeviceSpecs }) {
  return (
    <div className="space-y-3">
      <SpecItem spec={specs.banners} icon={<Image className="w-5 h-5" />} />
      <SpecItem spec={specs.products} icon={<FileImage className="w-5 h-5" />} />
      <SpecItem spec={specs.logo} icon={<Image className="w-5 h-5" />} />
      <SpecItem spec={specs.idle} icon={<Film className="w-5 h-5" />} />
    </div>
  );
}

export function ImageSpecsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Especificações de Imagens
        </CardTitle>
        <CardDescription>
          Dimensões recomendadas para cada tipo de dispositivo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="kiosk" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kiosk" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Totem
            </TabsTrigger>
            <TabsTrigger value="tablet" className="flex items-center gap-2">
              <Tablet className="w-4 h-4" />
              Tablet
            </TabsTrigger>
            <TabsTrigger value="tv" className="flex items-center gap-2">
              <Tv className="w-4 h-4" />
              TV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kiosk" className="mt-4">
            <div className="mb-4">
              <h3 className="font-semibold">{DEVICE_IMAGE_SPECS.kiosk.name}</h3>
              <p className="text-sm text-muted-foreground">{DEVICE_IMAGE_SPECS.kiosk.description}</p>
            </div>
            <DeviceSpecsList specs={DEVICE_IMAGE_SPECS.kiosk} />
          </TabsContent>

          <TabsContent value="tablet" className="mt-4">
            <div className="mb-4">
              <h3 className="font-semibold">{DEVICE_IMAGE_SPECS.tablet.name}</h3>
              <p className="text-sm text-muted-foreground">{DEVICE_IMAGE_SPECS.tablet.description}</p>
            </div>
            <DeviceSpecsList specs={DEVICE_IMAGE_SPECS.tablet} />
          </TabsContent>

          <TabsContent value="tv" className="mt-4">
            <div className="mb-4">
              <h3 className="font-semibold">{DEVICE_IMAGE_SPECS.tv.name}</h3>
              <p className="text-sm text-muted-foreground">{DEVICE_IMAGE_SPECS.tv.description}</p>
            </div>
            <DeviceSpecsList specs={DEVICE_IMAGE_SPECS.tv} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
