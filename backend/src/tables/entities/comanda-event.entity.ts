import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('comanda_events')
export class ComandaEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'comanda_id', type: 'uuid' })
  comandaId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: any;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
