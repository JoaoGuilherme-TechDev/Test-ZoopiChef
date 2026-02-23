import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subcategory } from './entities/subcategory.entity';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectRepository(Subcategory)
    private subcategoriesRepository: Repository<Subcategory>,
  ) {}

  async findAll(companyId: string): Promise<Subcategory[]> {
    return this.subcategoriesRepository.find({
      where: { companyId },
      relations: ['category'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Subcategory | null> {
    return this.subcategoriesRepository.findOne({ where: { id }, relations: ['category'] });
  }

  async create(createSubcategoryDto: Partial<Subcategory>): Promise<Subcategory> {
    const subcategory = this.subcategoriesRepository.create(createSubcategoryDto);
    return this.subcategoriesRepository.save(subcategory);
  }

  async update(id: string, updateSubcategoryDto: Partial<Subcategory>): Promise<Subcategory | null> {
    await this.subcategoriesRepository.update(id, updateSubcategoryDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.subcategoriesRepository.delete(id);
  }
}
