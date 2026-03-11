import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password: string;

  @IsNotEmpty({ message: 'O nome completo é obrigatório' })
  @IsString()
  full_name: string;

  @IsNotEmpty({ message: 'O ID da empresa é obrigatório' })
  @IsUUID()
  company_id: string;
}
