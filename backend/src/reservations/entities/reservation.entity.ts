import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Table } from '../../tables/entities/table.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'customer_id', nullable: true, type: 'uuid' })
  customerId: string;

  @Column({ name: 'table_id', nullable: true, type: 'uuid' })
  tableId: string;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'customer_phone' })
  customerPhone: string;

  @Column({ name: 'customer_email', nullable: true })
  customerEmail: string;

  @Column({ name: 'customer_cpf', nullable: true })
  customerCpf: string;

  @Column({ name: 'party_size' })
  partySize: number;

  @Column({ name: 'reservation_date' })
  reservationDate: string;

  @Column({ name: 'reservation_time' })
  reservationTime: string;

  @Column({ name: 'duration_minutes', default: 120 })
  durationMinutes: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'reservation_reason', nullable: true })
  reservationReason: string;

  @Column({ name: 'reservation_reason_other', nullable: true })
  reservationReasonOther: string;

  @Column({ name: 'needs_wheelchair_access', default: false })
  needsWheelchairAccess: boolean;

  @Column({ name: 'needs_disability_access', default: false })
  needsDisabilityAccess: boolean;

  @Column({ name: 'needs_baby_chair', default: false })
  needsBabyChair: boolean;

  @Column({ name: 'other_needs', nullable: true })
  otherNeeds: string;

  @Column({ name: 'confirmed_at', nullable: true })
  confirmedAt: Date;

  @Column({ name: 'confirmed_via', nullable: true })
  confirmedVia: string;

  @Column({ name: 'confirmation_token', nullable: true })
  confirmationToken: string;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'cancel_reason', nullable: true })
  cancelReason: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ name: 'special_requests', nullable: true })
  specialRequests: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Table)
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
