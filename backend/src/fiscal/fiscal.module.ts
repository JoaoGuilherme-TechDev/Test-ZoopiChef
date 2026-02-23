import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiscalService } from './fiscal.service';
import { FiscalController } from './fiscal.controller';
import { FiscalConfig } from './entities/fiscal-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FiscalConfig])],
  controllers: [FiscalController],
  providers: [FiscalService],
})
export class FiscalModule {}
