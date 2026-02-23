import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryConfig } from './entities/delivery-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryConfig])],
  controllers: [DeliveryController],
  providers: [DeliveryService],
})
export class DeliveryModule {}
