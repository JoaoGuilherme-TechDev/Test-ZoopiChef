import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { OptionalGroupItem } from './optional-group-item.entity';

@Entity('optional_groups')
export class OptionalGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column()
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'min_select', type: 'int', default: 0 })
  minSelect: number;

  @Column({ name: 'max_select', type: 'int', default: 1 })
  maxSelect: number;

  @Column({ default: false })
  required: boolean;

  @Column({ name: 'selection_unique', default: false })
  selectionUnique: boolean;

  @Column({ name: 'calc_mode', nullable: true })
  calcMode: string;

  @Column({ name: 'source_type', default: 'manual' })
  sourceType: string;

  @Column({ name: 'flavor_group_id', type: 'uuid', nullable: true })
  flavorGroupId: string;

  @Column({ name: 'subcategory_id', type: 'uuid', nullable: true })
  subcategoryId: string;

  @OneToMany(() => OptionalGroupItem, (item: OptionalGroupItem) => item.group, { cascade: true })
  items: OptionalGroupItem[];
}
