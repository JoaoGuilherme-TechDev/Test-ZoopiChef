// ================================================================
// FILE: zoopi-backend/src/waitlist/waitlist.module.ts
// ================================================================

import { Module } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}