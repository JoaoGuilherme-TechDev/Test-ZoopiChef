/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  /**
   * Este método é chamado automaticamente pelo NestJS após validar a assinatura do Token.
   * O objeto retornado aqui ficará disponível em todas as rotas como 'req.user'.
   */
  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      companyId: payload.companyId,
      companySlug: payload.companySlug,
      role: payload.role, // admin, waiter, chef, etc.
      globalRole: payload.globalRole, // super_admin ou user
      planType: payload.planType, // free, bronze, silver, gold
    };
  }
}
