/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { TenantGuard } from './guards/tenant.guard';
import { RolesGuard } from './guards/roles.guard';
import { PlanGuard } from './guards/plan.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    TenantGuard,
    RolesGuard,
    PlanGuard,
    SuperAdminGuard, // Registrando o novo guardião
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    JwtStrategy,
    TenantGuard,
    RolesGuard,
    PlanGuard,
    SuperAdminGuard, // Exportando para outros módulos
  ],
})
export class AuthModule {}
