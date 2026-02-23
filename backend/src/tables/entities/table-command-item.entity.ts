import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TableCommand } from './table-command.entity';
import { TableSession } from './table-session.entity';
import { Table } from './table.entity';

@Entity('table_command_items')
export class TableCommandItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'command_id', type: 'uuid' })
  commandId: string;

  @ManyToOne(() => TableCommand)
  @JoinColumn({ name: 'command_id' })
  command: TableCommand;

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

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column()
  quantity: number;

  @Column({ name: 'unit_price_cents' })
  unitPriceCents: number;

  @Column({ name: 'total_price_cents' })
  totalPriceCents: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: 'pending' })
  status: string; // pending, preparing, ready, delivered, cancelled

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
