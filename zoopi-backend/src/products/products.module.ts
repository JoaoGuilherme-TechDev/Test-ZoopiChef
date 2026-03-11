import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { OptionsGroupsService } from './options-groups.service';
import { OptionsGroupsController } from './options-groups.controller';
import { BatchActionsController } from './batch-actions.controller';
import { BatchActionsService } from './batch-actions.service';

@Module({
  controllers: [
    ProductsController,
    OptionsGroupsController,
    BatchActionsController,
  ],
  providers: [ProductsService, OptionsGroupsService, BatchActionsService],
  exports: [ProductsService, OptionsGroupsService],
})
export class ProductsModule {}
