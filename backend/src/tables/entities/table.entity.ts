import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tables')
export class Table {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column()
  number: number;

  @Column({ nullable: true })
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column({ default: 'available' })
  status: string;

  @Column({ name: 'current_order_id', nullable: true, type: 'uuid' })
  currentOrderId: string;

  @Column({ default: 4 })
  capacity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
