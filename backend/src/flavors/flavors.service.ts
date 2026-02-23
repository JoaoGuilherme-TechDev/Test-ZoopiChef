import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flavor } from './entities/flavor.entity';
import { FlavorPrice } from './entities/flavor-price.entity';
import { ProductFlavor } from './entities/product-flavor.entity';

@Injectable()
export class FlavorsService {
  constructor(
    @InjectRepository(Flavor)
    private flavorsRepository: Repository<Flavor>,
    @InjectRepository(FlavorPrice)
    private flavorPricesRepository: Repository<FlavorPrice>,
    @InjectRepository(ProductFlavor)
    private productFlavorsRepository: Repository<ProductFlavor>,
  ) {}

  async create(createFlavorDto: Partial<Flavor>): Promise<Flavor> {
    const flavor = this.flavorsRepository.create(createFlavorDto);
    return this.flavorsRepository.save(flavor);
  }

  async findAll(companyId: string): Promise<Flavor[]> {
    return this.flavorsRepository.find({
      where: { companyId },
      order: { name: 'ASC' },
      relations: ['flavorGroup', 'prices'],
    });
  }

  async findOne(id: string): Promise<Flavor | null> {
    return this.flavorsRepository.findOne({ where: { id }, relations: ['flavorGroup', 'prices'] });
  }

  async update(id: string, updateFlavorDto: Partial<Flavor>): Promise<Flavor | null> {
    await this.flavorsRepository.update(id, updateFlavorDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.flavorsRepository.delete(id);
  }

  // Flavor Prices

  async findAllPrices(companyId: string): Promise<FlavorPrice[]> {
    return this.flavorPricesRepository.find({ where: { companyId } });
  }

  async findPricesByFlavor(flavorId: string): Promise<FlavorPrice[]> {
    return this.flavorPricesRepository.find({ where: { flavorId } });
  }

  async upsertPrice(priceDto: Partial<FlavorPrice>): Promise<FlavorPrice> {
    if (priceDto.id) {
      await this.flavorPricesRepository.update(priceDto.id, priceDto);
      return this.flavorPricesRepository.findOne({ where: { id: priceDto.id } });
    }
    const price = this.flavorPricesRepository.create(priceDto);
    return this.flavorPricesRepository.save(price);
  }

  async removePrice(id: string): Promise<void> {
    await this.flavorPricesRepository.delete(id);
  }

  // Product Flavors (Associations)

  async getProductFlavors(productId: string): Promise<ProductFlavor[]> {
    return this.productFlavorsRepository.find({
      where: { productId },
      relations: ['flavor'],
      order: { sortOrder: 'ASC' },
    });
  }

  async addFlavorToProduct(dto: Partial<ProductFlavor>): Promise<ProductFlavor> {
    const link = this.productFlavorsRepository.create(dto);
    return this.productFlavorsRepository.save(link);
  }

  async removeFlavorFromProduct(productId: string, flavorId: string): Promise<void> {
    await this.productFlavorsRepository.delete({ productId, flavorId });
  }
}
