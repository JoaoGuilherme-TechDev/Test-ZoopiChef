import { Module } from '@nestjs/common';
import { PrintServiceController } from './print-service.controller';
import { PrintServiceService } from './print-service.service';

// Module for print service functionality
@Module({
  controllers: [PrintServiceController],
  providers: [PrintServiceService],
})
export class PrintServiceModule {}
