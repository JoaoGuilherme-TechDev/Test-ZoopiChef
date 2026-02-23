import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('company_integrations')
export class CompanyIntegrations {
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'whatsapp_provider', nullable: true })
  whatsappProvider: string;

  @Column({ name: 'whatsapp_api_key_masked', nullable: true })
  whatsappApiKeyMasked: string;

  @Column({ name: 'whatsapp_instance_id', nullable: true })
  whatsappInstanceId: string;

  @Column({ name: 'whatsapp_default_number', nullable: true })
  whatsappDefaultNumber: string;

  @Column({ name: 'whatsapp_enabled', default: false })
  whatsappEnabled: boolean;

  @Column({ name: 'pix_provider', nullable: true })
  pixProvider: string;

  @Column({ name: 'pix_enabled', default: false })
  pixEnabled: boolean;

  @Column({ name: 'pix_key', nullable: true })
  pixKey: string;

  @Column({ name: 'pix_key_type', nullable: true })
  pixKeyType: string;

  @Column({ name: 'stripe_enabled', default: false })
  stripeEnabled: boolean;

  @Column({ name: 'stripe_secret_key_masked', nullable: true })
  stripeSecretKeyMasked: string;

  @Column({ name: 'stripe_publishable_key', nullable: true })
  stripePublishableKey: string;

  @Column({ name: 'stripe_webhook_secret_masked', nullable: true })
  stripeWebhookSecretMasked: string;

  @Column({ name: 'stripe_account_id', nullable: true })
  stripeAccountId: string;

  @Column({ name: 'stripe_mode', default: 'test' })
  stripeMode: string;

  @Column({ name: 'payment_gateway', default: 'manual' })
  paymentGateway: string;

  @Column({ name: 'review_enabled', default: false })
  reviewEnabled: boolean;

  @Column({ name: 'review_auto_send', default: false })
  reviewAutoSend: boolean;

  @Column({ name: 'review_delay_minutes', default: 60 })
  reviewDelayMinutes: number;

  @Column({ name: 'review_default_public', default: true })
  reviewDefaultPublic: boolean;

  @Column({ name: 'review_require_comment', default: false })
  reviewRequireComment: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
