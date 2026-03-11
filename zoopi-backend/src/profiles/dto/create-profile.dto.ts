import { IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateProfileDto {
  @IsUUID()
  user_id: string; // O ID que vem do Auth

  @IsUUID()
  company_id: string; // A qual empresa ele pertence

  @IsString()
  @IsOptional()
  full_name?: string;
}
