import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Length,
  Min,
  Max,
} from 'class-validator';

export class CreateTaxRuleDto {
  @IsNotEmpty({
    message: 'Dê um nome para identificar esta regra (Ex: Venda Interna)',
  })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'O CFOP é obrigatório' })
  @IsString()
  @Length(4, 4, { message: 'O CFOP deve ter exatamente 4 dígitos' })
  cfop: string;

  @IsNotEmpty({ message: 'UF de origem é obrigatória' })
  @IsString()
  @Length(2, 2, { message: 'Use a sigla da UF (Ex: SP)' })
  origin_uf: string;

  @IsNotEmpty({ message: 'UF de destino é obrigatória' })
  @IsString()
  @Length(2, 2, { message: 'Use a sigla da UF (Ex: RJ)' })
  dest_uf: string;

  @IsNotEmpty({ message: 'O CST ou CSOSN do ICMS é obrigatório' })
  @IsString()
  @Length(3, 3, { message: 'O CST/CSOSN deve ter 3 dígitos' })
  icms_cst: string;

  @IsNotEmpty({
    message: 'A origem da mercadoria é obrigatória (0 para Nacional)',
  })
  @IsNumber()
  @Min(0)
  @Max(8)
  icms_orig: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  icms_rate?: number;

  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'O CST do PIS deve ter 2 dígitos' })
  pis_cst?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pis_rate?: number;

  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'O CST do COFINS deve ter 2 dígitos' })
  cofins_cst?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cofins_rate?: number;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
