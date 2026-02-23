import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('comanda_settings')
export class ComandaSettings {
  @PrimaryColumn('uuid', { name: 'company_id' })
  companyId: string;

  @Column({ name: 'no_activity_minutes', default: 30 })
  noActivityMinutes: number;

  @Column({ name: 'default_service_fee_percent', type: 'decimal', default: 10 })
  defaultServiceFeePercent: number;

  @Column({ name: 'allow_close_with_balance', default: false })
  allowCloseWithBalance: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
