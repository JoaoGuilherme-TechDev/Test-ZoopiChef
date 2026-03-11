import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsNotEmpty({ message: 'A senha atual é obrigatória para verificação.' })
  @IsString()
  oldPassword: string;

  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres.' })
  newPassword: string;
}
