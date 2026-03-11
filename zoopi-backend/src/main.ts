/* eslint-disable @typescript-eslint/no-floating-promises */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 Application is running on: http://localhost:${port}/api`);
    console.log(
      `📁 Static files available on: http://localhost:${port}/uploads`,
    );
  }
}
bootstrap();
