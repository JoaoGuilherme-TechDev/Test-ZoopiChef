/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { User, Loader2, Camera } from "lucide-react";
import { getCroppedImg } from "@/utils/cropImage";
import { profileService } from "@/services/profileService";

export interface AvatarUploadProps {
  currentAvatar?: string | null;
  fullName?: string;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (message: string) => void;
}

export const AvatarUpload = ({
  currentAvatar,
  fullName,
  onUploadSuccess,
  onUploadError,
}: AvatarUploadProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImage(reader.result as string);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setIsDialogOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleSaveCrop = async () => {
    if (!image || !croppedAreaPixels) return;
    setIsUploading(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
      const response = await profileService.uploadAvatar(file);
      if (onUploadSuccess) onUploadSuccess(response.avatar_url);
      setIsDialogOpen(false);
      setImage(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Erro ao processar imagem.";
      if (onUploadError) onUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setImage(null);
  };

  // ✅ CORRIGIDO: usa avatar_url diretamente (já normalizado pelo profileService)
  const avatarSrc = currentAvatar ?? null;

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  return (
    <>
      {/* ✅ CORRIGIDO: sem animate-glow-pulse, overlay só aparece no hover via CSS puro */}
      <div className="relative group cursor-pointer">
        <div className="w-28 h-28 rounded-full border-2 border-primary/30 overflow-hidden bg-muted flex items-center justify-center transition-all duration-300 group-hover:border-primary/70 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={fullName ?? "Avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-black text-muted-foreground/50 select-none">
              {initials}
            </span>
          )}

          {/* Overlay de hover — só aparece ao passar o mouse, sem piscar */}
          <label className="absolute inset-0 rounded-full bg-black/55 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
            <Camera className="w-5 h-5 text-white mb-0.5" />
            <span className="text-[9px] text-white font-bold uppercase tracking-widest">
              Alterar
            </span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*"
            />
          </label>
        </div>
      </div>

      {/* Modal de Cropper */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-[480px] bg-card border-white/5 p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-white/5">
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              Ajustar Foto de Perfil
            </DialogTitle>
          </DialogHeader>

          <div className="relative h-72 w-full bg-black">
            {image && (
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                <span>Zoom</span>
                <span>{(zoom * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isUploading}
                className="uppercase font-bold text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCrop}
                disabled={isUploading || !croppedAreaPixels}
                className="btn-neon min-w-[140px]"
              >
                {isUploading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  "Confirmar"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};