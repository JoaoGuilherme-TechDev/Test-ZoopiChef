import { Module } from '@nestjs/common';
import { SaasService } from './saas.service';
import { SaasController } from './saas.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Necessário para usar os Guards de autenticação e super_admin
  controllers: [SaasController],
  providers: [SaasService],
})
export class SaasModule {}
