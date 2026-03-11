// ================================================================
// FILE: zoopi-backend/src/waitlist/dto/waitlist.dto.ts
// ================================================================

import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  IsBoolean,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class CreateWaitlistEntryDto {
  @IsString()
  @MinLength(2)
  customer_name: string;

  @IsOptional()
  @IsString()
  customer_phone?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  party_size: number;

  @IsOptional()
  @IsString()
  special_requests?: string;
}

export class SeatWaitlistEntryDto {
  @IsUUID()
  table_id: string;
}

export class CancelWaitlistEntryDto {
  @IsOptional()
  @IsBoolean()
  no_show?: boolean; // true = no_show, false/omitted = cancelled
}
