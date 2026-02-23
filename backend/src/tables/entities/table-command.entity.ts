import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TableSession } from './table-session.entity';
import { Table } from './table.entity';

@Entity('table_commands')
export class TableCommand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => TableSession)
  @JoinColumn({ name: 'session_id' })
  session: TableSession;

  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @ManyToOne(() => Table)
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  number: number;

  @Column({ default: 'open' })
  status: string;

  @Column({ name: 'total_amount_cents', default: 0 })
  totalAmountCents: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
