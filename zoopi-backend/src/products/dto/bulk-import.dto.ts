// src/products/dto/bulk-import.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from './create-product.dto';

export class BulkImportItemDto {
  @IsNotEmpty({ message: 'O nome do produto é obrigatório' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'O preço é obrigatório' })
  @IsNumber()
  price: number;

  @IsNotEmpty({ message: 'A categoria é obrigatória' })
  @IsString()
  category_name: string;

  @IsOptional()
  @IsString()
  subcategory_name?: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType = ProductType.SIMPLE;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsString()
  cest?: string;
}

export class BulkImportProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportItemDto)
  items: BulkImportItemDto[];
}
