// src/tables/dto/tables.dto.ts
import {
  IsString, IsNotEmpty, IsOptional,
  IsArray, ValidateNested, IsInt, Min,
  IsIn,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTableDto {
  @IsOptional()
  capacity?: number;

  @IsOptional()
  section?: string;
}

export class UpdateTableDto {
  @IsOptional()
  capacity?: number;

  @IsOptional()
  section?: string;
}

export class UpdateTableStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['free', 'occupied', 'reserved', 'no_consumption', 'payment'])
  status: 'free' | 'occupied' | 'reserved' | 'no_consumption' | 'payment';
}

export class CreateCommandDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class LaunchOrderItemDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;

  // FIX: @IsOptional() alone does NOT whitelist a field — it only skips
  // validation when absent. Need @IsString() so the field survives
  // ValidationPipe whitelist:true and reaches the service.
  @IsOptional()
  @IsString()
  command_id?: string;
}

export class LaunchOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LaunchOrderItemDto)
  items: LaunchOrderItemDto[];
}

export class TransferItemsDto {
  @IsArray()
  @IsString({ each: true })
  item_ids: string[];

  @IsString()
  @IsNotEmpty()
  target_table_id: string;

  @IsOptional()
  @IsString()
  target_command_id?: string;
}

export class TransferTableDto {
  @IsString()
  @IsNotEmpty()
  target_table_id: string;
}

export class MergeTablesDto {
  @IsString()
  @IsNotEmpty()
  source_table_id: string;
}

export class SubmitPaymentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['total', 'parcial', 'por_comanda', 'adiantamento'])
  mode: 'total' | 'parcial' | 'por_comanda' | 'adiantamento';

  @IsString()
  @IsNotEmpty()
  @IsIn(['dinheiro', 'credito', 'debito', 'pix', 'maquininha'])
  method: 'dinheiro' | 'credito' | 'debito' | 'pix' | 'maquininha';

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  command_id?: string;

}