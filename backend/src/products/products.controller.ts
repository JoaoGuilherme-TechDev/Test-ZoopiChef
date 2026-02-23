import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductPizzaConfig } from './entities/product-pizza-config.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createProductDto: Partial<Product>) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    if (!companyId) return [];
    return this.productsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: Partial<Product>) {
    return this.productsService.update(id, updateProductDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // Pizza Config Endpoints

  @Get(':id/pizza-config')
  getPizzaConfig(@Param('id') id: string) {
    return this.productsService.getPizzaConfig(id);
  }

  @UseGuards(AuthGuard)
  @Post(':id/pizza-config')
  upsertPizzaConfig(@Param('id') id: string, @Body() configDto: Partial<ProductPizzaConfig>) {
    return this.productsService.upsertPizzaConfig(id, configDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id/pizza-config')
  deletePizzaConfig(@Param('id') id: string) {
    return this.productsService.deletePizzaConfig(id);
  }
}
