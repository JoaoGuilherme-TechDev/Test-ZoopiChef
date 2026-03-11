import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUUID,
} from 'class-validator';

export class CreateSubcategoryDto {
  @IsNotEmpty({ message: 'O nome da subcategoria é obrigatório' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'O ID da categoria é obrigatório' })
  @IsUUID()
  category_id: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
