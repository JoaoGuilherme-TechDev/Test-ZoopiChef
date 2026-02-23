import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ComboGroup } from './combo-group.entity';

@Entity('combos')
export class Combo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'combo_type' })
  comboType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'fiscal_mode', default: 'manual' })
  fiscalMode: string;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'aparece_delivery', default: true })
  apareceDelivery: boolean;

  @Column({ name: 'aparece_totem', default: true })
  apareceTotem: boolean;

  @Column({ name: 'aparece_tablet', default: true })
  apareceTablet: boolean;

  @Column({ name: 'aparece_mesa', default: true })
  apareceMesa: boolean;

  @Column({ name: 'aparece_comanda', default: true })
  apareceComanda: boolean;

  @Column({ name: 'aparece_garcom', default: true })
  apareceGarcom: boolean;

  @Column({ name: 'aparece_tv', default: true })
  apareceTv: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ComboGroup, (group) => group.combo)
  groups: ComboGroup[];
}
