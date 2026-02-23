import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deliverer } from './entities/deliverer.entity';

@Injectable()
export class DeliverersService {
  constructor(
    @InjectRepository(Deliverer)
    private deliverersRepository: Repository<Deliverer>,
  ) {}

  async create(createDelivererDto: Partial<Deliverer>): Promise<Deliverer> {
    const deliverer = this.deliverersRepository.create(createDelivererDto);
    return this.deliverersRepository.save(deliverer);
  }

  async findAll(companyId: string): Promise<Deliverer[]> {
    return this.deliverersRepository.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Deliverer | null> {
    return this.deliverersRepository.findOneBy({ id });
  }

  async update(id: string, updateDelivererDto: Partial<Deliverer>): Promise<Deliverer | null> {
    await this.deliverersRepository.update(id, updateDelivererDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.deliverersRepository.delete(id);
  }
}
