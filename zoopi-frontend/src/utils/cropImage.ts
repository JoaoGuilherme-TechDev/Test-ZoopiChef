import { Area } from "react-easy-crop";

/**
 * Cria um elemento de imagem a partir de uma URL (data URL ou http)
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

/**
 * Recorta uma imagem usando a Canvas API com base nas coordenadas
 * retornadas pelo react-easy-crop (pixelCrop).
 *
 * @param imageSrc  - Data URL da imagem original (base64)
 * @param pixelCrop - Área de corte em pixels { x, y, width, height }
 * @returns Promise<Blob> - O blob da imagem recortada em JPEG
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Não foi possível obter o contexto 2D do canvas.");
  }

  // Define as dimensões do canvas como as do recorte
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Desenha apenas a região recortada da imagem original no canvas
  ctx.drawImage(
    image,
    pixelCrop.x,      // posição X de origem na imagem
    pixelCrop.y,      // posição Y de origem na imagem
    pixelCrop.width,  // largura a copiar da origem
    pixelCrop.height, // altura a copiar da origem
    0,                // posição X de destino no canvas
    0,                // posição Y de destino no canvas
    pixelCrop.width,  // largura no destino
    pixelCrop.height  // altura no destino
  );

  // Exporta o canvas como Blob JPEG com qualidade 90%
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob retornou nulo."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
}