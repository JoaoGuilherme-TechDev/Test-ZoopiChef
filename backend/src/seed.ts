import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { CreateUserDto } from './users/dto/create-user.dto';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const adminEmail = 'admin@admin.com';
  // Use try-catch for findByEmail as it might throw if not found or DB error
  let existingUser;
  try {
    existingUser = await usersService.findByEmail(adminEmail);
  } catch (e) {
    // Ignore error if user not found, or handle specific error
    existingUser = null; 
  }

  if (existingUser) {
    console.log('Admin user already exists.');
  } else {
    console.log('Creating admin user...');
    try {
      const adminUser: CreateUserDto = {
        email: adminEmail,
        password: 'password', 
        fullName: 'Admin User',
        role: 'admin',
      };
      
      await usersService.create(adminUser);
      console.log('Admin user created successfully.');
      console.log('Email: admin@admin.com');
      console.log('Password: password');
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }

  await app.close();
}

bootstrap();
