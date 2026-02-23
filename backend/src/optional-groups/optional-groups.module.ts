import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptionalGroupsService } from './optional-groups.service';
import { OptionalGroupsController } from './optional-groups.controller';
import { OptionalGroup } from './entities/optional-group.entity';
import { OptionalGroupItem } from './entities/optional-group-item.entity';
import { Product } from '../products/entities/product.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([OptionalGroup, OptionalGroupItem, Product]), AuthModule],
  controllers: [OptionalGroupsController],
  providers: [OptionalGroupsService],
})
export class OptionalGroupsModule {}
