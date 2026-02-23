import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  async seedAdminUser() {
    const adminEmail = 'admin@zoopi.com';
    const existingAdmin = await this.usersService.findByEmail(adminEmail);
    if (!existingAdmin) {
      console.log('Seeding admin user...');
      await this.usersService.create({
        email: adminEmail,
        password: 'admin123', // Will be hashed by UsersService
        fullName: 'System Admin',
        role: 'admin',
        companyId: null, // System admin doesn't belong to a specific company initially
      });
      console.log('Admin user created: admin@zoopi.com / admin123');
    }
  }

  async signIn(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException();
    }

    const payload = { sub: user.id, username: user.email, role: user.role, companyId: user.companyId };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        companyId: user.companyId,
      }
    };
  }
}
