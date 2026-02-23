import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // Enable CORS
  app.enableCors();
  
  // Port configuration
  // We can't listen on 3847 AND 9898 in the same app unless we spawn multiple servers
  // or use different paths.
  // However, the user wants to refactor "everything".
  // The print-service listens on 3847.
  // The print-agent listens on 9898 (implied by "localhost:9898" comment in print-agent-v3/server.js).
  
  // For now, I'll run this NestJS app on a new port, e.g., 3000, 
  // and we can migrate the clients to use this new port or setup a proxy.
  // OR I can make it listen on multiple ports if needed, but that's complex in NestJS main.ts.
  
  // Let's use 3847 as the default for now as it's the "service" port.
  // If we need to support both, we might need to run two instances or use a different strategy.
  
  await app.listen(3847);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
