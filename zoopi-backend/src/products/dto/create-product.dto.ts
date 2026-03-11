import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Enum espelhando o banco
export enum ProductType {
  SIMPLE = 'simple',
  PIZZA = 'pizza',
  ADDITIONAL = 'additional',
  COMBO = 'combo',
}

export class ProductPriceDto {
  @IsNotEmpty({ message: 'O rótulo do preço é obrigatório (ex: Padrão)' })
  @IsString()
  label: string;

  @IsNotEmpty({ message: 'O preço é obrigatório' })
  @IsNumber({}, { message: 'O preço deve ser um número' })
  @Min(0)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  delivery_price?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  order?: number;
}

export class CreateProductDto {
  @IsNotEmpty({ message: 'O nome do produto é obrigatório' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'O ID da categoria é obrigatório' })
  @IsUUID()
  category_id: string;

  @IsOptional()
  @IsUUID()
  subcategory_id?: string;

  @IsNotEmpty({ message: 'O tipo do produto é obrigatório' })
  @IsEnum(ProductType)
  type: ProductType;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  // Fiscal
  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsString()
  cest?: string;

  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  ean?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  cost_price?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  profit_margin?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  sale_price?: number;

  @IsOptional()
  @IsBoolean()
  is_on_sale?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  wholesale_price?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  wholesale_min_qty?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  loyalty_points?: number;

  @IsOptional()
  @IsString()
  enologist_notes?: string;

  @IsOptional()
  @IsString()
  production_location?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  commission?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  aparece_delivery?: boolean;

  @IsOptional()
  @IsBoolean()
  aparece_garcom?: boolean;

  @IsOptional()
  @IsBoolean()
  aparece_totem?: boolean;

  @IsOptional()
  @IsBoolean()
  aparece_tablet?: boolean;

  @IsOptional()
  @IsBoolean()
  aparece_mesa?: boolean;

  @IsOptional()
  @IsBoolean()
  aparece_comanda?: boolean;

  @IsOptional()
  @IsBoolean()
  aparece_tv?: boolean;

  @IsOptional()
  @IsBoolean()
  aparece_self_service?: boolean;

  @IsOptional()
  @IsBoolean()
  display_on_tablet?: boolean;

  @IsOptional()
  @IsString()
  composition?: string;

  @IsOptional()
  @IsString()
  production_weight?: string;

  @IsOptional()
  @IsBoolean()
  is_weighted?: boolean;

  @IsOptional()
  @IsString()
  tax_status?: string;

  @IsOptional()
  @IsString()
  internal_code?: string;

  // Matriz de Preços
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceDto)
  @IsNotEmpty({ message: 'O produto deve ter pelo menos um preço cadastrado' })
  prices: ProductPriceDto[];

  // IDs dos grupos de opcionais que serão vinculados (N:N)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  option_group_ids?: string[];
}
