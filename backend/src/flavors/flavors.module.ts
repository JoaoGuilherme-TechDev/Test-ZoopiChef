import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlavorsService } from './flavors.service';
import { FlavorsController } from './flavors.controller';
import { Flavor } from './entities/flavor.entity';
import { FlavorPrice } from './entities/flavor-price.entity';
import { ProductFlavor } from './entities/product-flavor.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Flavor, FlavorPrice, ProductFlavor]), AuthModule],
  controllers: [FlavorsController],
  providers: [FlavorsService],
  exports: [FlavorsService],
})
export class FlavorsModule {}
