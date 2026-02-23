import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Request() req, @Body() createCompanyDto: { name: string; slug: string }) {
    return this.companiesService.create({
      ...createCompanyDto,
      userId: req.user.sub,
    });
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async findMyCompany(@Request() req) {
    const company = await this.companiesService.findByUser(req.user.sub);
    if (!company) {
      throw new NotFoundException('User does not have a company');
    }
    return company;
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: any) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @UseGuards(AuthGuard)
  @Get(':id/users')
  findCompanyUsers(@Param('id') id: string) {
    return this.companiesService.findUsers(id);
  }

  @UseGuards(AuthGuard)
  @Get(':id/integrations')
  findIntegrations(@Param('id') id: string) {
    return this.companiesService.findIntegrations(id);
  }

  @UseGuards(AuthGuard)
  @Post(':id/integrations')
  upsertIntegrations(@Param('id') id: string, @Body() updates: any) {
    return this.companiesService.upsertIntegrations(id, updates);
  }

  @UseGuards(AuthGuard)
  @Get(':id/ai-settings')
  findAISettings(@Param('id') id: string) {
    return this.companiesService.findAISettings(id);
  }

  @UseGuards(AuthGuard)
  @Post(':id/ai-settings')
  upsertAISettings(@Param('id') id: string, @Body() updates: any) {
    return this.companiesService.upsertAISettings(id, updates);
  }

  @UseGuards(AuthGuard)
  @Get(':id/public-links')
  findPublicLinks(@Param('id') id: string) {
    return this.companiesService.findPublicLinks(id);
  }
}
