import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Combo } from './combo.entity';
import { ComboGroupItem } from './combo-group-item.entity';

@Entity('combo_groups')
export class ComboGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'combo_id', type: 'uuid' })
  comboId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'min_select', default: 1 })
  minSelect: number;

  @Column({ name: 'max_select', default: 1 })
  maxSelect: number;

  @Column({ default: true })
  required: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Combo, (combo) => combo.groups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'combo_id' })
  combo: Combo;

  @OneToMany(() => ComboGroupItem, (item) => item.group)
  items: ComboGroupItem[];
}
