import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { OptionalGroup } from './optional-group.entity';

@Entity('optional_group_items')
export class OptionalGroupItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'optional_group_id', type: 'uuid' })
  optionalGroupId: string;

  @ManyToOne(() => OptionalGroup, (group: OptionalGroup) => group.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'optional_group_id' })
  group: OptionalGroup;

  @Column({ name: 'label' })
  label: string;

  @Column({ name: 'price_delta', type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceDelta: number;

  @Column({ name: 'price_override', type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOverride: number;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string;

  @Column({ name: 'flavor_id', type: 'uuid', nullable: true })
  flavorId: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  active: boolean;
}
