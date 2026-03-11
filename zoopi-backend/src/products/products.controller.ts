import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkImportProductsDto } from './dto/bulk-import.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @GetCompanyId() companyId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    // Injeta o companyId extraído do Token para garantir o isolamento (Multi-tenant)
    return this.productsService.create(companyId, createProductDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkImport(
    @GetCompanyId() companyId: string,
    @Body() dto: BulkImportProductsDto,
  ) {
    return this.productsService.bulkImport(companyId, dto);
  }

  @Post('extract-ia')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  extractWithIA(@GetCompanyId() companyId: string, @UploadedFile() file: any) {
    return this.productsService.extractWithIA(companyId, file);
  }

  @Get('export')
  exportProducts(@GetCompanyId() companyId: string) {
    return this.productsService.exportProducts(companyId);
  }

  @Get()
  findAll(@GetCompanyId() companyId: string) {
    // Lista apenas produtos da empresa do usuário logado
    return this.productsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.productsService.findOne(id, companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, companyId, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.productsService.remove(id, companyId);
  }
}
