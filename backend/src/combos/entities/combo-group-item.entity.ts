import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ComboGroup } from './combo-group.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('combo_group_items')
export class ComboGroupItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'combo_group_id', type: 'uuid' })
  comboGroupId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'additional_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  additionalPrice: number;

  @Column({ name: 'custom_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  customPrice: number;

  @Column({ name: 'inherit_price', default: false })
  inheritPrice: boolean;

  @Column({ name: 'fiscal_override', nullable: true })
  fiscalOverride: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ComboGroup, (group) => group.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'combo_group_id' })
  group: ComboGroup;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
