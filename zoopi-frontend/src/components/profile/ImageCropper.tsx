import React, { useState } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

// ✅ CORRIGIDO: removido o parâmetro posicional duplicado "image"
export function ImageCropper({ image, onCropComplete, onCancel, onConfirm }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleCropComplete = (_: Area, croppedAreaPixels: Area) => {
    onCropComplete(croppedAreaPixels);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg glass-card border-primary/30 shadow-neon-mixed overflow-hidden flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="text-lg font-semibold text-gradient-primary">Recortar Foto</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Área do Cropper */}
        <div className="relative h-80 w-full bg-black/40">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        {/* Controles de Zoom */}
        <div className="p-6 space-y-6 bg-card/50">
          <div className="flex items-center gap-4">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="uppercase font-bold text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              className="btn-neon min-w-[150px] uppercase font-bold text-xs"
            >
              Confirmar Foto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}