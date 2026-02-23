import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryConfig } from './entities/delivery-config.entity';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryConfig)
    private deliveryConfigRepository: Repository<DeliveryConfig>,
  ) {}

  async getConfig(companyId: string): Promise<DeliveryConfig | null> {
    return this.deliveryConfigRepository.findOne({ where: { companyId } });
  }

  async createOrUpdateConfig(companyId: string, config: Partial<DeliveryConfig>): Promise<DeliveryConfig> {
    const existing = await this.getConfig(companyId);
    if (existing) {
      Object.assign(existing, config);
      return this.deliveryConfigRepository.save(existing);
    }
    const newConfig = this.deliveryConfigRepository.create({ ...config, companyId });
    return this.deliveryConfigRepository.save(newConfig);
  }

  async calculateDelivery(companyId: string, distanceKm: number): Promise<number> {
    const config = await this.getConfig(companyId);
    if (!config) return 0;

    if (distanceKm > config.maxDistanceKm) {
      return -1; // Too far
    }
    
    // Placeholder for complex logic
    return config.fallbackFee;
  }
}
