import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OptionalGroup } from './entities/optional-group.entity';
import { OptionalGroupItem } from './entities/optional-group-item.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class OptionalGroupsService {
  constructor(
    @InjectRepository(OptionalGroup)
    private optionalGroupsRepository: Repository<OptionalGroup>,
    @InjectRepository(OptionalGroupItem)
    private optionalGroupItemsRepository: Repository<OptionalGroupItem>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async create(createOptionalGroupDto: Partial<OptionalGroup>): Promise<OptionalGroup> {
    const group = this.optionalGroupsRepository.create(createOptionalGroupDto);
    return this.optionalGroupsRepository.save(group);
  }

  async findAll(companyId: string): Promise<OptionalGroup[]> {
    return this.optionalGroupsRepository.find({
      where: { companyId },
      relations: ['items'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<OptionalGroup | null> {
    return this.optionalGroupsRepository.findOne({ 
      where: { id },
      relations: ['items'],
    });
  }

  async update(id: string, updateOptionalGroupDto: Partial<OptionalGroup>): Promise<OptionalGroup | null> {
    await this.optionalGroupsRepository.update(id, updateOptionalGroupDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.optionalGroupsRepository.delete(id);
  }

  // Items
  async createItem(createItemDto: Partial<OptionalGroupItem>): Promise<OptionalGroupItem> {
    const item = this.optionalGroupItemsRepository.create(createItemDto);
    return this.optionalGroupItemsRepository.save(item);
  }

  async updateItem(id: string, updateItemDto: Partial<OptionalGroupItem>): Promise<OptionalGroupItem> {
    await this.optionalGroupItemsRepository.update(id, updateItemDto);
    return this.optionalGroupItemsRepository.findOne({ where: { id } });
  }

  async removeItem(id: string): Promise<void> {
    await this.optionalGroupItemsRepository.delete(id);
  }

  async syncProducts(groupId: string, subcategoryId: string): Promise<{ inserted: number }> {
    const products = await this.productsRepository.find({ 
      where: { subcategoryId, isActive: true } 
    });
    
    if (!products.length) return { inserted: 0 };

    const existingItems = await this.optionalGroupItemsRepository.find({ 
      where: { optionalGroupId: groupId } 
    });
    const existingProductIds = new Set(existingItems.map(i => i.productId).filter(Boolean));

    let insertedCount = 0;
    for (const product of products) {
      if (!existingProductIds.has(product.id)) {
        const newItem = this.optionalGroupItemsRepository.create({
          optionalGroupId: groupId,
          productId: product.id,
          label: product.name,
          priceDelta: (product.priceCents || 0) / 100,
          active: true,
          sortOrder: 10,
        });
        await this.optionalGroupItemsRepository.save(newItem);
        insertedCount++;
      }
    }
    
    return { inserted: insertedCount };
  }
}
