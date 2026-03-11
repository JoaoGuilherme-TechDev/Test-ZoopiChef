import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  Length,
} from 'class-validator';

// Definimos o enum aqui para validação, espelhando o banco
export enum TaxRegime {
  SIMPLES_NACIONAL = 'simples_nacional',
  SIMPLES_NACIONAL_EXCESSO = 'simples_nacional_excesso',
  LUCRO_PRESUMIDO = 'lucro_presumido',
  LUCRO_REAL = 'lucro_real',
}

export class UpsertFiscalConfigDto {
  @IsNotEmpty({ message: 'O CNPJ é obrigatório' })
  @IsString()
  @Length(14, 14, {
    message: 'O CNPJ deve ter exatamente 14 dígitos (apenas números)',
  })
  cnpj: string;

  @IsNotEmpty({ message: 'A Inscrição Estadual é obrigatória' })
  @IsString()
  ie: string;

  @IsOptional()
  @IsString()
  im?: string;

  @IsNotEmpty({ message: 'O regime tributário é obrigatório' })
  @IsEnum(TaxRegime, { message: 'Regime tributário inválido' })
  tax_regime: TaxRegime;

  @IsOptional()
  @IsBoolean()
  is_sandbox?: boolean;

  @IsOptional()
  @IsString()
  csc_token?: string;

  @IsOptional()
  @IsString()
  csc_id?: string;
}
