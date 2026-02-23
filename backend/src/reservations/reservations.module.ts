import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from './entities/reservation.entity';

import { ReservationSettings } from './entities/reservation-settings.entity';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { ReservationBlock } from './entities/reservation-block.entity';
import { SmartWaitlistEntry } from './entities/smart-waitlist-entry.entity';
import { SmartWaitlistSettings } from './entities/smart-waitlist-settings.entity';
import { TableSession } from '../tables/entities/table-session.entity';
import { Comanda } from '../tables/entities/comanda.entity';
import { Table } from '../tables/entities/table.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
    Reservation,
    ReservationSettings,
    WaitlistEntry,
    ReservationBlock,
    SmartWaitlistEntry,
    SmartWaitlistSettings,
    TableSession,
    Comanda,
    Table
  ]),
  AuthModule
],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
