import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OptionItemDto {
  @IsOptional()
  id?: string;

  @IsNotEmpty({ message: 'O nome do item opcional é obrigatório' })
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateOptionGroupDto {
  @IsNotEmpty({ message: 'O nome do grupo de opcionais é obrigatório' })
  @IsString()
  name: string;

  @IsNotEmpty({
    message: 'A quantidade mínima é obrigatória (0 para opcional)',
  })
  @IsInt()
  @Min(0)
  min_qty: number;

  @IsNotEmpty({ message: 'A quantidade máxima é obrigatória' })
  @IsInt()
  @Min(1)
  max_qty: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionItemDto)
  items?: OptionItemDto[];
}
