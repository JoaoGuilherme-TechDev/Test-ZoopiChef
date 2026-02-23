import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('company_ai_settings')
export class CompanyAISettings {
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'chat_provider', default: 'openai' })
  chatProvider: string;

  @Column({ name: 'chat_enabled', default: false })
  chatEnabled: boolean;

  @Column({ name: 'tts_provider', default: 'openai' })
  ttsProvider: string;

  @Column({ name: 'tts_enabled', default: false })
  ttsEnabled: boolean;

  @Column({ name: 'daily_analysis_limit', default: 5 })
  dailyAnalysisLimit: number;

  @Column({ name: 'daily_chat_limit', default: 50 })
  dailyChatLimit: number;

  @Column({ name: 'analysis_count_today', default: 0 })
  analysisCountToday: number;

  @Column({ name: 'chat_count_today', default: 0 })
  chatCountToday: number;

  @Column({ name: 'last_reset_date', type: 'date', default: () => 'CURRENT_DATE' })
  lastResetDate: string;

  @Column({ name: 'openai_api_key', nullable: true })
  openaiApiKey: string;

  @Column({ name: 'gemini_api_key', nullable: true })
  geminiApiKey: string;

  @Column({ name: 'anthropic_api_key', nullable: true })
  anthropicApiKey: string;

  @Column({ name: 'groq_api_key', nullable: true })
  groqApiKey: string;

  @Column({ name: 'preferred_model', nullable: true })
  preferredModel: string;

  @Column({ name: 'use_custom_keys', default: false })
  useCustomKeys: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
