import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { FlavorsService } from './flavors.service';
import { Flavor } from './entities/flavor.entity';
import { FlavorPrice } from './entities/flavor-price.entity';
import { ProductFlavor } from './entities/product-flavor.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('flavors')
export class FlavorsController {
  constructor(private readonly flavorsService: FlavorsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createFlavorDto: Partial<Flavor>) {
    return this.flavorsService.create(createFlavorDto);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    if (!companyId) return [];
    return this.flavorsService.findAll(companyId);
  }

  @Get('prices/all')
  findAllPrices(@Query('companyId') companyId: string) {
      if (!companyId) return [];
      return this.flavorsService.findAllPrices(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flavorsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateFlavorDto: Partial<Flavor>) {
    return this.flavorsService.update(id, updateFlavorDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.flavorsService.remove(id);
  }

  // Prices

  @Get(':id/prices')
  getPrices(@Param('id') id: string) {
    return this.flavorsService.findPricesByFlavor(id);
  }

  @UseGuards(AuthGuard)
  @Post('prices')
  upsertPrice(@Body() priceDto: Partial<FlavorPrice>) {
    return this.flavorsService.upsertPrice(priceDto);
  }

  @UseGuards(AuthGuard)
  @Delete('prices/:id')
  deletePrice(@Param('id') id: string) {
    return this.flavorsService.removePrice(id);
  }

  // Product Association

  @UseGuards(AuthGuard)
  @Post('product')
  linkFlavor(@Body() dto: Partial<ProductFlavor>) {
    return this.flavorsService.addFlavorToProduct(dto);
  }

  @UseGuards(AuthGuard)
  @Delete('product/:productId/:flavorId')
  unlinkFlavor(@Param('productId') productId: string, @Param('flavorId') flavorId: string) {
    return this.flavorsService.removeFlavorFromProduct(productId, flavorId);
  }
}
