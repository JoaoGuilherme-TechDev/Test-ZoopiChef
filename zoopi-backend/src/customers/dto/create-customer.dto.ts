import { IsString, IsNotEmpty, IsOptional, IsEmail, IsInt, Min, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty({ message: 'O nome do cliente é obrigatório' })
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  tax_id?: string; // CPF/CNPJ

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsOptional()
  @IsString()
  zip_code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  credit_limit_cents?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}