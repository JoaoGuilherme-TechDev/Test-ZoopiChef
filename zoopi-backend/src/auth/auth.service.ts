import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });

    if (existingUser) {
      throw new ConflictException('Este e-mail já está em uso.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return await this.db.transaction(async (tx) => {
      // Cria o usuário com papel global padrão 'user'
      const [newUser] = await tx
        .insert(schema.users)
        .values({
          email: dto.email,
          password: hashedPassword,
          global_role: 'user',
        })
        .returning();

      // Cria o perfil vinculado à empresa com o cargo 'admin' (pois é o criador da conta)
      const [newProfile] = await tx
        .insert(schema.profiles)
        .values({
          user_id: newUser.id,
          company_id: dto.company_id,
          full_name: dto.full_name,
          role: 'admin',
        })
        .returning();

      return {
        id: newUser.id,
        email: newUser.email,
        full_name: newProfile.full_name,
      };
    });
  }

  async login(dto: LoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
      with: {
        profile: {
          with: {
            company: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const profile = user.profile;
    const company = profile?.company;

    // Payload do JWT agora muito mais completo para segurança de rotas
    const payload = {
      sub: user.id,
      email: user.email,
      companyId: company?.id,
      companySlug: company?.slug,
      role: profile?.role, // Cargo na empresa (admin, waiter, etc)
      globalRole: user.global_role, // Cargo no sistema (super_admin ou user)
      planType: company?.plan_type, // Tipo de plano da empresa
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name,
        company_id: company?.id,
        company_slug: company?.slug,
        role: profile?.role,
        global_role: user.global_role,
        plan_type: company?.plan_type,
      },
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
