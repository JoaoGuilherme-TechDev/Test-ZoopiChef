import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { FlavorGroup } from '../../flavor-groups/entities/flavor-group.entity';
import { FlavorPrice } from './flavor-price.entity';

@Entity('flavors')
export class Flavor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column()
  name: string;

  @Column({ name: 'flavor_group_id', type: 'uuid', nullable: true })
  flavorGroupId: string;

  @ManyToOne(() => FlavorGroup)
  @JoinColumn({ name: 'flavor_group_id' })
  flavorGroup: FlavorGroup;

  @OneToMany(() => FlavorPrice, (price) => price.flavor)
  prices: FlavorPrice[];

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'ingredients_raw', nullable: true })
  ingredientsRaw: string;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'usage_type', default: 'pizza' })
  usageType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
