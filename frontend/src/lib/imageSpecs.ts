/**
 * Especificações de dimensões de imagens para diferentes dispositivos
 * 
 * Estas dimensões garantem que as imagens de marketing sejam exibidas
 * corretamente em cada tipo de dispositivo.
 */

export interface ImageSpecification {
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  description: string;
  maxSizeMB: number;
  recommendedFormats: string[];
}

export interface DeviceSpecs {
  name: string;
  description: string;
  banners: ImageSpecification;
  products: ImageSpecification;
  logo: ImageSpecification;
  idle: ImageSpecification;
}

/**
 * Especificações do Totem de Autoatendimento (Kiosk)
 * Tela vertical grande (geralmente 21-32 polegadas)
 */
export const KIOSK_SPECS: DeviceSpecs = {
  name: 'Totem',
  description: 'Totem de autoatendimento vertical',
  banners: {
    name: 'Banner Promocional',
    width: 1080,
    height: 300,
    aspectRatio: '18:5',
    description: 'Banner no header do cardápio (carrossel)',
    maxSizeMB: 2,
    recommendedFormats: ['JPG', 'PNG', 'WebP'],
  },
  products: {
    name: 'Imagem de Produto',
    width: 600,
    height: 600,
    aspectRatio: '1:1',
    description: 'Foto do produto no cardápio',
    maxSizeMB: 1,
    recommendedFormats: ['JPG', 'PNG', 'WebP'],
  },
  logo: {
    name: 'Logo',
    width: 400,
    height: 200,
    aspectRatio: '2:1',
    description: 'Logo da empresa na tela inicial',
    maxSizeMB: 1,
    recommendedFormats: ['PNG', 'SVG'],
  },
  idle: {
    name: 'Tela de Atração',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    description: 'Imagem/vídeo fullscreen quando ocioso (vertical)',
    maxSizeMB: 5,
    recommendedFormats: ['JPG', 'PNG', 'WebP', 'MP4'],
  },
};

/**
 * Especificações do Tablet de Mesa
 * Tablet horizontal/vertical (geralmente 10-12 polegadas)
 */
export const TABLET_SPECS: DeviceSpecs = {
  name: 'Tablet',
  description: 'Tablet de autoatendimento de mesa',
  banners: {
    name: 'Banner Promocional',
    width: 800,
    height: 200,
    aspectRatio: '4:1',
    description: 'Banner no topo do cardápio',
    maxSizeMB: 1,
    recommendedFormats: ['JPG', 'PNG', 'WebP'],
  },
  products: {
    name: 'Imagem de Produto',
    width: 400,
    height: 400,
    aspectRatio: '1:1',
    description: 'Foto do produto no cardápio',
    maxSizeMB: 0.5,
    recommendedFormats: ['JPG', 'PNG', 'WebP'],
  },
  logo: {
    name: 'Logo',
    width: 300,
    height: 150,
    aspectRatio: '2:1',
    description: 'Logo no header',
    maxSizeMB: 0.5,
    recommendedFormats: ['PNG', 'SVG'],
  },
  idle: {
    name: 'Tela Ociosa',
    width: 1200,
    height: 800,
    aspectRatio: '3:2',
    description: 'Imagem quando tablet está ocioso',
    maxSizeMB: 2,
    recommendedFormats: ['JPG', 'PNG', 'WebP'],
  },
};

/**
 * Especificações da TV de Exibição
 * TV grande (geralmente 42-65 polegadas, Full HD ou 4K)
 */
export const TV_SPECS: DeviceSpecs = {
  name: 'TV',
  description: 'Tela de exibição de cardápio digital',
  banners: {
    name: 'Banner/Slide',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    description: 'Banner fullscreen ou slide promocional',
    maxSizeMB: 3,
    recommendedFormats: ['JPG', 'PNG', 'WebP', 'MP4'],
  },
  products: {
    name: 'Imagem de Produto',
    width: 800,
    height: 800,
    aspectRatio: '1:1',
    description: 'Foto do produto no menu',
    maxSizeMB: 1,
    recommendedFormats: ['JPG', 'PNG', 'WebP'],
  },
  logo: {
    name: 'Logo',
    width: 600,
    height: 300,
    aspectRatio: '2:1',
    description: 'Logo no canto da tela',
    maxSizeMB: 1,
    recommendedFormats: ['PNG', 'SVG'],
  },
  idle: {
    name: 'Tela de Exibição',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    description: 'Conteúdo de exibição padrão',
    maxSizeMB: 5,
    recommendedFormats: ['JPG', 'PNG', 'WebP', 'MP4'],
  },
};

/**
 * Todas as especificações por dispositivo
 */
export const DEVICE_IMAGE_SPECS = {
  kiosk: KIOSK_SPECS,
  tablet: TABLET_SPECS,
  tv: TV_SPECS,
} as const;

/**
 * Formata dimensões para exibição
 */
export function formatDimensions(spec: ImageSpecification): string {
  return `${spec.width} × ${spec.height}px`;
}

/**
 * Verifica se uma imagem atende às especificações
 */
export function validateImageDimensions(
  width: number,
  height: number,
  spec: ImageSpecification,
  tolerance: number = 0.1
): { valid: boolean; message: string } {
  const expectedRatio = spec.width / spec.height;
  const actualRatio = width / height;
  
  // Verificar aspect ratio com tolerância
  if (Math.abs(actualRatio - expectedRatio) > tolerance) {
    return {
      valid: false,
      message: `Proporção incorreta. Esperado: ${spec.aspectRatio}, atual: ${(actualRatio).toFixed(2)}`,
    };
  }

  // Verificar se a resolução é adequada (mínimo 50% da resolução recomendada)
  if (width < spec.width * 0.5 || height < spec.height * 0.5) {
    return {
      valid: false,
      message: `Resolução muito baixa. Recomendado: ${formatDimensions(spec)}`,
    };
  }

  return {
    valid: true,
    message: 'Dimensões adequadas',
  };
}
