import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    CompaniesModule,
  ],
  providers: [CronService],
})
export class CronModule {}
