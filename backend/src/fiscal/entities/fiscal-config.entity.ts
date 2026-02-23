import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('fiscal_config')
export class FiscalConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ default: 'integra_notas' })
  provider: string;

  @Column({ default: 'sandbox' })
  environment: string;

  @Column({ name: 'is_enabled', default: false })
  isEnabled: boolean;

  @Column({ name: 'api_token', nullable: true })
  apiToken: string;

  @Column({ name: 'api_secret', nullable: true })
  apiSecret: string;

  @Column({ name: 'webhook_secret', nullable: true })
  webhookSecret: string;

  @Column({ name: 'provider_settings', type: 'jsonb', default: {} })
  providerSettings: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
