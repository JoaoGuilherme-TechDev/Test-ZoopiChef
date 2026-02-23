import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('smart_waitlist_settings')
export class SmartWaitlistSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'avg_turnover_minutes', default: 90 })
  avgTurnoverMinutes: number;

  @Column({ name: 'notify_before_minutes', default: 15 })
  notifyBeforeMinutes: number;

  @Column({ name: 'allow_remote_checkin', default: false })
  allowRemoteCheckin: boolean;

  @Column({ name: 'show_estimated_wait', default: true })
  showEstimatedWait: boolean;

  @Column({ name: 'priority_vip_customers', default: true })
  priorityVipCustomers: boolean;

  @Column({ name: 'auto_remove_no_show_minutes', default: 15 })
  autoRemoveNoShowMinutes: number;

  @Column({ name: 'sms_notifications', default: false })
  smsNotifications: boolean;

  @Column({ name: 'whatsapp_notifications', default: true })
  whatsappNotifications: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
