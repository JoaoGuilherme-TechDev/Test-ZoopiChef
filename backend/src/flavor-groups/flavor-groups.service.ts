import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlavorGroup } from './entities/flavor-group.entity';

@Injectable()
export class FlavorGroupsService {
  constructor(
    @InjectRepository(FlavorGroup)
    private flavorGroupsRepository: Repository<FlavorGroup>,
  ) {}

  async create(createFlavorGroupDto: Partial<FlavorGroup>): Promise<FlavorGroup> {
    const group = this.flavorGroupsRepository.create(createFlavorGroupDto);
    return this.flavorGroupsRepository.save(group);
  }

  async findAll(companyId: string): Promise<FlavorGroup[]> {
    return this.flavorGroupsRepository.find({
      where: { companyId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findOne(id: string): Promise<FlavorGroup | null> {
    return this.flavorGroupsRepository.findOne({ where: { id } });
  }

  async update(id: string, updateFlavorGroupDto: Partial<FlavorGroup>): Promise<FlavorGroup | null> {
    await this.flavorGroupsRepository.update(id, updateFlavorGroupDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.flavorGroupsRepository.delete(id);
  }
}
