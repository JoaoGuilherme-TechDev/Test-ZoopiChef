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
import { SubcategoriesService } from './subcategories.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';

@Controller('subcategories')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Post()
  create(
    @GetCompanyId() companyId: string,
    @Body() createSubcategoryDto: CreateSubcategoryDto,
  ) {
    return this.subcategoriesService.create(companyId, createSubcategoryDto);
  }

  @Get()
  findAll(@GetCompanyId() companyId: string) {
    return this.subcategoriesService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.subcategoriesService.findOne(id, companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() updateSubcategoryDto: UpdateSubcategoryDto,
  ) {
    return this.subcategoriesService.update(
      id,
      companyId,
      updateSubcategoryDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.subcategoriesService.remove(id, companyId);
  }
}
