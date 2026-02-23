import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cash_sessions')
export class CashSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ default: 'open' })
  status: string; // 'open' | 'closed'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'opened_at', nullable: true, type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'closed_at', nullable: true, type: 'timestamptz' })
  closedAt: Date;
}
