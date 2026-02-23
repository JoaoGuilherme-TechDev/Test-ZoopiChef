import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOneOptions } from 'typeorm';
import { Combo } from './entities/combo.entity';
import { ComboGroup } from './entities/combo-group.entity';
import { ComboGroupItem } from './entities/combo-group-item.entity';

@Injectable()
export class CombosService {
  constructor(
    @InjectRepository(Combo)
    private combosRepository: Repository<Combo>,
    @InjectRepository(ComboGroup)
    private comboGroupsRepository: Repository<ComboGroup>,
    @InjectRepository(ComboGroupItem)
    private comboGroupItemsRepository: Repository<ComboGroupItem>,
  ) {}

  async findAll(companyId: string) {
    const options: FindManyOptions<Combo> = {
      where: { companyId },
      relations: ['groups', 'groups.items', 'groups.items.product'],
      order: {
        createdAt: 'DESC',
        groups: {
          displayOrder: 'ASC',
          items: {
            displayOrder: 'ASC',
          },
        },
      } as any, // Cast to any to avoid deep recursion type error
    };
    return this.combosRepository.find(options);
  }

  async findOne(id: string, companyId: string) {
    const options: FindOneOptions<Combo> = {
      where: { id, companyId },
      relations: ['groups', 'groups.items', 'groups.items.product'],
      order: {
        groups: {
          displayOrder: 'ASC',
          items: {
            displayOrder: 'ASC',
          },
        },
      } as any,
    };
    const combo = await this.combosRepository.findOne(options);

    if (!combo) {
      throw new NotFoundException(`Combo with ID ${id} not found`);
    }

    return combo;
  }

  async create(createComboDto: any) {
    const combo = this.combosRepository.create(createComboDto);
    return this.combosRepository.save(combo);
  }

  async update(id: string, updateComboDto: any) {
    await this.combosRepository.update(id, updateComboDto);
    return this.combosRepository.findOne({ where: { id } });
  }

  async remove(id: string) {
    await this.combosRepository.delete(id);
  }

  // Groups
  async createGroup(createGroupDto: any) {
    const group = this.comboGroupsRepository.create(createGroupDto);
    return this.comboGroupsRepository.save(group);
  }

  async updateGroup(id: string, updateGroupDto: any) {
    await this.comboGroupsRepository.update(id, updateGroupDto);
    return this.comboGroupsRepository.findOne({ where: { id } });
  }

  async removeGroup(id: string) {
    await this.comboGroupsRepository.delete(id);
  }

  // Items
  async createGroupItem(createItemDto: any) {
    const item = this.comboGroupItemsRepository.create(createItemDto);
    return this.comboGroupItemsRepository.save(item);
  }

  async updateGroupItem(id: string, updateItemDto: any) {
    await this.comboGroupItemsRepository.update(id, updateItemDto);
    return this.comboGroupItemsRepository.findOne({ where: { id } });
  }

  async removeGroupItem(id: string) {
    await this.comboGroupItemsRepository.delete(id);
  }

  async addProductsToGroup(groupId: string, companyId: string, productIds: string[]) {
    const group = await this.comboGroupsRepository.findOne({ where: { id: groupId } }); 
    
    if (!group) {
      throw new NotFoundException(`Combo Group with ID ${groupId} not found`);
    }

    const items = productIds.map((productId, index) => {
      return this.comboGroupItemsRepository.create({
        comboGroupId: groupId,
        companyId, 
        productId,
        displayOrder: index,
        additionalPrice: 0,
        inheritPrice: false,
        active: true,
      });
    });

    return this.comboGroupItemsRepository.save(items);
  }
}
