import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // Pega o companyId que a JwtStrategy injetou no user
    return request.user?.companyId;
  },
);
