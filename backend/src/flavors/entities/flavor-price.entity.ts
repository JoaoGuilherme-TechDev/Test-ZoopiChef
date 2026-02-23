import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Flavor } from './flavor.entity';

@Entity('flavor_prices')
export class FlavorPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'flavor_id', type: 'uuid' })
  flavorId: string;

  @ManyToOne(() => Flavor, (flavor) => flavor.prices)
  @JoinColumn({ name: 'flavor_id' })
  flavor: Flavor;

  @Column({ name: 'size_name' })
  sizeName: string;

  @Column({ name: 'price_per_part', type: 'decimal', precision: 10, scale: 2, default: 0 })
  pricePerPart: number;

  @Column({ name: 'price_full', type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceFull: number;

  @Column({ name: 'price_avg', type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceAvg: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
