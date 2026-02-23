import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Table } from './table.entity';

@Entity('table_qr_tokens')
export class TableQRToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @Column({ type: 'text', unique: true })
  token: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Table)
  @JoinColumn({ name: 'table_id' })
  table: Table;
}
