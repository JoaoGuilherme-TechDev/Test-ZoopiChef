import { Controller, Get, Post, Body, Param, Delete, Query, Put, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createCustomerDto: Partial<Customer>) {
    return this.customersService.create(createCustomerDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query('companyId') companyId: string) {
    if (!companyId) return [];
    return this.customersService.findAll(companyId);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: Partial<Customer>) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
