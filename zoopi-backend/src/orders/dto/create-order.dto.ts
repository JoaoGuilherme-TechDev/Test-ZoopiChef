/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para os itens individuais do pedido
 */
export class CreateOrderItemDto {
  @IsNotEmpty({ message: 'O ID do produto é obrigatório' })
  @IsUUID('4', { message: 'ID do produto inválido' })
  product_id: string;

  @IsNotEmpty({ message: 'A quantidade é obrigatória' })
  @IsInt({ message: 'A quantidade deve ser um número inteiro' })
  @Min(1, { message: 'A quantidade mínima é 1' })
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO principal para criação de pedido
 *
 * Regra usada:
 * - Se tiver table_number => pedido de mesa
 * - Se NÃO tiver table_number => pedido de delivery
 */
export class CreateOrderDto {
  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  @Length(11, 14, { message: 'O CPF/CNPJ deve ter entre 11 e 14 dígitos' })
  customer_tax_id?: string;

  @IsOptional()
  @IsString()
  table_number?: string;

  @ValidateIf(
    (o: CreateOrderDto) =>
      !o.table_number || o.table_number.trim() === '',
  )
  @IsNotEmpty({
    message: 'A forma de pagamento é obrigatória para pedidos delivery',
  })
  @IsString()
  payment_method?: string;

  @IsArray({ message: 'O pedido deve conter uma lista de itens' })
  @IsNotEmpty({ message: 'O pedido não pode estar vazio' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}