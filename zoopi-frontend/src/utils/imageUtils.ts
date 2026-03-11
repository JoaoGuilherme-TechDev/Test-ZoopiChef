import { Area } from "react-easy-crop";

/**
 * Cria um elemento de imagem a partir de uma URL
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // Evita problemas de CORS
    image.src = url;
  });

/**
 * Processa o recorte da imagem e retorna um Blob (arquivo) pronto para upload
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  // Define o tamanho do canvas baseado no recorte
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Desenha a imagem recortada no canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Retorna como Blob (formato de arquivo)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/jpeg");
  });
}