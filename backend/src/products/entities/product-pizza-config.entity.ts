import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_pizza_config')
export class ProductPizzaConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @OneToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'requires_size', default: false })
  requiresSize: boolean;

  @Column({ name: 'allowed_sizes', type: 'simple-array', nullable: true })
  allowedSizes: string[];

  @Column({ name: 'slices_per_size', type: 'jsonb', nullable: true })
  slicesPerSize: Record<string, number>;

  @Column({ name: 'max_flavors_per_size', type: 'jsonb', nullable: true })
  maxFlavorsPerSize: Record<string, number>;

  @Column({ name: 'pricing_model', default: 'media' })
  pricingModel: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
