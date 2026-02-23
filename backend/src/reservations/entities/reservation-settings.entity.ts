import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reservation_settings')
export class ReservationSettings {
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'min_advance_hours', default: 2 })
  minAdvanceHours: number;

  @Column({ name: 'max_advance_days', default: 30 })
  maxAdvanceDays: number;

  @Column({ name: 'default_duration_minutes', default: 120 })
  defaultDurationMinutes: number;

  @Column({ name: 'opening_time', default: '11:00' })
  openingTime: string;

  @Column({ name: 'closing_time', default: '23:00' })
  closingTime: string;

  @Column({ name: 'slot_interval_minutes', default: 30 })
  slotIntervalMinutes: number;

  @Column({ name: 'max_party_size', default: 20 })
  maxPartySize: number;

  @Column({ name: 'min_party_size', default: 1 })
  minPartySize: number;

  @Column({ name: 'auto_confirm', default: false })
  autoConfirm: boolean;

  @Column({ name: 'require_confirmation', default: true })
  requireConfirmation: boolean;

  @Column({ name: 'confirmation_deadline_hours', default: 24 })
  confirmationDeadlineHours: number;

  @Column({ name: 'send_whatsapp_confirmation', default: true })
  sendWhatsappConfirmation: boolean;

  @Column({ name: 'send_whatsapp_reminder', default: true })
  sendWhatsappReminder: boolean;

  @Column({ name: 'reminder_hours_before', default: 3 })
  reminderHoursBefore: number;

  @Column({ name: 'confirmation_message_template', nullable: true })
  confirmationMessageTemplate: string;

  @Column({ name: 'reminder_message_template', nullable: true })
  reminderMessageTemplate: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
