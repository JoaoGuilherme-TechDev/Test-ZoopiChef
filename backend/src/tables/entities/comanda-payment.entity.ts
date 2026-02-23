import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('comanda_payments')
export class ComandaPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'comanda_id', type: 'uuid' })
  comandaId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'payment_method' })
  paymentMethod: string;

  @Column({ name: 'paid_by_name', nullable: true })
  paidByName: string;

  @Column({ name: 'paid_by_user_id', type: 'uuid', nullable: true })
  paidByUserId: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string;

  @Column({ name: 'loyalty_points_awarded', type: 'int', default: 0 })
  loyaltyPointsAwarded: number;

  @Column({ nullable: true })
  nsu: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
