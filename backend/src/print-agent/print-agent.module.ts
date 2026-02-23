import { Module } from '@nestjs/common';
import { PrintAgentController } from './print-agent.controller';
import { PrintAgentService } from './print-agent.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PrintAgentController],
  providers: [PrintAgentService],
})
export class PrintAgentModule {}
