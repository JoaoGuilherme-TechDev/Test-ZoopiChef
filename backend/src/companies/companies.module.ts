import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { Company } from './entities/company.entity';
import { CompanyIntegrations } from './entities/company-integrations.entity';
import { CompanyAISettings } from './entities/company-ai-settings.entity';
import { CompanyPublicLinks } from './entities/company-public-links.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, CompanyIntegrations, CompanyAISettings, CompanyPublicLinks, User]),
    AuthModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
