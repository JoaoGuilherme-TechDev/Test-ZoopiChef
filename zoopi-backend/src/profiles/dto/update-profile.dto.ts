/* eslint-disable @typescript-eslint/no-unused-vars */
import { IsString, IsOptional, IsUrl, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto' })
  @Length(3, 255, { message: 'O nome deve ter entre 3 e 255 caracteres' })
  full_name?: string;

  @IsOptional()
  @IsString({ message: 'O telefone deve ser um texto' })
  @Length(8, 20, { message: 'O telefone deve ser válido' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'A URL do avatar deve ser um texto' })
  // Não usamos @IsUrl porque pode ser um caminho relativo ou base64 temporário
  avatar_url?: string;
}
