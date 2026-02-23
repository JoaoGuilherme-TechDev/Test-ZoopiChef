import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly companiesService: CompaniesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug('Running daily subscription check...');
    
    const companies = await this.companiesService.findAll();
    const now = new Date();
    
    for (const company of companies) {
      if (company.trialEndsAt && new Date(company.trialEndsAt) < now && company.isActive) {
        // Suspend company if trial expired and no active subscription (simplified logic)
        // In future: check subscription status or plan
        this.logger.log(`Suspending company ${company.name} (Trial expired at ${company.trialEndsAt})`);
        await this.companiesService.update(company.id, { 
          isActive: false, 
          suspendedReason: 'Trial expired' 
        });
      }
    }
  }
}
