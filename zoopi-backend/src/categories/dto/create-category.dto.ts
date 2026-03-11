import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'O nome da categoria é obrigatório' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString({ message: 'A imagem deve ser uma string ou URL' })
  image_url?: string;

  @IsOptional()
  @IsString({ message: 'A cor deve ser uma string hexadecimal' })
  color?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
