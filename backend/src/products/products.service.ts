import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductPizzaConfig } from './entities/product-pizza-config.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductPizzaConfig)
    private pizzaConfigRepository: Repository<ProductPizzaConfig>,
  ) {}

  async findAll(companyId: string): Promise<Product[]> {
    return this.productsRepository.find({
      where: { companyId },
      relations: ['subcategory', 'subcategory.category', 'pizzaConfig', 'productFlavors', 'productFlavors.flavor'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { id }, relations: ['subcategory', 'subcategory.category', 'pizzaConfig', 'productFlavors', 'productFlavors.flavor'] });
  }

  async create(createProductDto: Partial<Product>): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    return this.productsRepository.save(product);
  }

  async update(id: string, updateProductDto: Partial<Product>): Promise<Product | null> {
    await this.productsRepository.update(id, updateProductDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.productsRepository.delete(id);
  }

  // Pizza Config Methods

  async getPizzaConfig(productId: string): Promise<ProductPizzaConfig | null> {
    return this.pizzaConfigRepository.findOne({ where: { productId } });
  }

  async upsertPizzaConfig(productId: string, configDto: Partial<ProductPizzaConfig>): Promise<ProductPizzaConfig> {
    const existing = await this.pizzaConfigRepository.findOne({ where: { productId } });
    if (existing) {
      await this.pizzaConfigRepository.update(existing.id, configDto);
      return this.pizzaConfigRepository.findOne({ where: { id: existing.id } });
    }
    const config = this.pizzaConfigRepository.create({ ...configDto, productId });
    return this.pizzaConfigRepository.save(config);
  }

  async deletePizzaConfig(productId: string): Promise<void> {
    await this.pizzaConfigRepository.delete({ productId });
  }
}
