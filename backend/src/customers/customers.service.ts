import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: Partial<Customer>): Promise<Customer> {
    const customer = this.customersRepository.create(createCustomerDto);
    return this.customersRepository.save(customer);
  }

  async findAll(companyId: string): Promise<Customer[]> {
    return this.customersRepository.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Customer | null> {
    return this.customersRepository.findOneBy({ id });
  }

  async update(id: string, updateCustomerDto: Partial<Customer>): Promise<Customer | null> {
    await this.customersRepository.update(id, updateCustomerDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.customersRepository.delete(id);
  }
}
