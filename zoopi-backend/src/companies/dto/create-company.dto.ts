import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome da empresa é obrigatório' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'O slug da empresa é obrigatório' })
  slug: string;
}
