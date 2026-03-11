import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateEmailDto {
  @IsNotEmpty({ message: 'O novo e-mail é obrigatório.' })
  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  email: string;
}
