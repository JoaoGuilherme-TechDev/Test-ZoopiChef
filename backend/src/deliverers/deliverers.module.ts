import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliverersService } from './deliverers.service';
import { DeliverersController } from './deliverers.controller';
import { Deliverer } from './entities/deliverer.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Deliverer]), AuthModule],
  controllers: [DeliverersController],
  providers: [DeliverersService],
  exports: [DeliverersService],
})
export class DeliverersModule {}
