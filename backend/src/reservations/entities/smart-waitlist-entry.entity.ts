import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('smart_waitlist')
export class SmartWaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'customer_id', nullable: true, type: 'uuid' })
  customerId: string;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone: string;

  @Column({ name: 'party_size' })
  partySize: number;

  @Column({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ name: 'estimated_wait_minutes', nullable: true })
  estimatedWaitMinutes: number;

  @Column({ name: 'predicted_seat_time', nullable: true })
  predictedSeatTime: Date;

  @Column({ name: 'actual_seat_time', nullable: true })
  actualSeatTime: Date;

  @Column({ default: 'waiting' })
  status: string;

  @Column({ name: 'priority_score', default: 0 })
  priorityScore: number;

  @Column({ name: 'special_requests', nullable: true })
  specialRequests: string;

  @Column({ name: 'table_preference', nullable: true })
  tablePreference: string;

  @Column({ name: 'notified_at', nullable: true })
  notifiedAt: Date;

  @Column({ name: 'no_show', default: false })
  noShow: boolean;

  @Column({ name: 'tracking_token', nullable: true })
  trackingToken: string;

  @Column({ name: 'assigned_table_id', nullable: true, type: 'uuid' })
  assignedTableId: string;

  @Column({ name: 'assigned_table_number', nullable: true })
  assignedTableNumber: number;

  @Column({ name: 'comanda_id', nullable: true, type: 'uuid' })
  comandaId: string;

  @Column({ name: 'table_notified_at', nullable: true })
  tableNotifiedAt: Date;

  @Column({ name: 'table_notification_sent', default: false })
  tableNotificationSent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
