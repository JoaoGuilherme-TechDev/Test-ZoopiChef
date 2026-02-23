import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Flavor } from './flavor.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('product_flavors')
export class ProductFlavor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'flavor_id', type: 'uuid' })
  flavorId: string;

  @ManyToOne(() => Flavor)
  @JoinColumn({ name: 'flavor_id' })
  flavor: Flavor;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
