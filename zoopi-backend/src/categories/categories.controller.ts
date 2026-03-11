import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard, TenantGuard) // Proteção global para todas as rotas de categoria
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @GetCompanyId() companyId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    // Injeta o ID da empresa automaticamente na criação
    return this.categoriesService.create(companyId, createCategoryDto);
  }

  @Get()
  findAll(@GetCompanyId() companyId: string) {
    // Retorna apenas as categorias da empresa do usuário logado
    return this.categoriesService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.categoriesService.findOne(id, companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, companyId, updateCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.categoriesService.remove(id, companyId);
  }
}
