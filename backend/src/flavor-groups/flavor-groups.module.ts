import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlavorGroupsService } from './flavor-groups.service';
import { FlavorGroupsController } from './flavor-groups.controller';
import { FlavorGroup } from './entities/flavor-group.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([FlavorGroup]), AuthModule],
  controllers: [FlavorGroupsController],
  providers: [FlavorGroupsService],
})
export class FlavorGroupsModule {}
