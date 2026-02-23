import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column()
  name: string;

  @Column()
  whatsapp: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  alerts: string;

  @Column({ nullable: true })
  document: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'credit_balance', type: 'decimal', precision: 10, scale: 2, default: 0 })
  creditBalance: number;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 10, scale: 2, nullable: true })
  creditLimit: number;

  @Column({ name: 'allow_credit', default: false })
  allowCredit: boolean;

  @Column({ name: 'is_blocked', default: false })
  isBlocked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
