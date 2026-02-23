import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('waitlist')
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'customer_id', nullable: true, type: 'uuid' })
  customerId: string;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'customer_phone' })
  customerPhone: string;

  @Column({ name: 'party_size' })
  partySize: number;

  @Column({ name: 'desired_date' })
  desiredDate: string;

  @Column({ name: 'desired_time', nullable: true })
  desiredTime: string;

  @Column({ name: 'flexible_time', default: false })
  flexibleTime: boolean;

  @Column({ default: 'waiting' })
  status: string; // 'waiting' | 'notified' | 'converted' | 'expired'

  @Column({ name: 'converted_to_reservation_id', nullable: true, type: 'uuid' })
  convertedToReservationId: string;

  @Column({ name: 'notified_at', nullable: true })
  notifiedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
