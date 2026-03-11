import {
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { eq, and, ne } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfilesService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(createProfileDto: CreateProfileDto) {
    const company = await this.db.query.companies.findFirst({
      where: eq(schema.companies.id, createProfileDto.company_id),
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const [newProfile] = await this.db
      .insert(schema.profiles)
      .values({
        user_id: createProfileDto.user_id,
        company_id: createProfileDto.company_id,
        full_name: createProfileDto.full_name,
      })
      .returning();

    return newProfile;
  }

  async findByUserId(userId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(schema.profiles.user_id, userId),
      with: {
        company: true,
        user: {
          columns: {
            password: false, // Segurança: nunca retornar o hash da senha
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado.');
    }

    return profile;
  }

  async update(userId: string, companyId: string, dto: UpdateProfileDto) {
    const [updatedProfile] = await this.db
      .update(schema.profiles)
      .set({
        ...dto,
      })
      .where(
        and(
          eq(schema.profiles.user_id, userId),
          eq(schema.profiles.company_id, companyId),
        ),
      )
      .returning();

    if (!updatedProfile) {
      throw new NotFoundException('Perfil não encontrado para atualização.');
    }

    return updatedProfile;
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // 1. Verificar se a senha antiga está correta
    const isPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('A senha atual está incorreta.');
    }

    // 2. Gerar novo hash e atualizar
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.db
      .update(schema.users)
      .set({ password: hashedNewPassword, updated_at: new Date() })
      .where(eq(schema.users.id, userId));

    return { message: 'Senha atualizada com sucesso.' };
  }

  async updateEmail(userId: string, dto: UpdateEmailDto) {
    // 1. Verificar se o novo e-mail já está em uso por outro usuário
    const emailExists = await this.db.query.users.findFirst({
      where: and(
        eq(schema.users.email, dto.email),
        ne(schema.users.id, userId),
      ),
    });

    if (emailExists) {
      throw new ConflictException('Este e-mail já está sendo utilizado.');
    }

    // 2. Atualizar o e-mail
    await this.db
      .update(schema.users)
      .set({ email: dto.email, updated_at: new Date() })
      .where(eq(schema.users.id, userId));

    return { message: 'E-mail atualizado com sucesso.', email: dto.email };
  }
}
