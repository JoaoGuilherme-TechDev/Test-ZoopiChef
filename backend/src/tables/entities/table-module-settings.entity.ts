import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('table_module_settings')
export class TableModuleSettings {
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'idle_warning_minutes', type: 'int', default: 30 })
  idleWarningMinutes: number;

  @Column({ name: 'enable_qr_ordering', type: 'boolean', default: true })
  enableQrOrdering: boolean;

  @Column({ name: 'enable_qr_menu_only', type: 'boolean', default: false })
  enableQrMenuOnly: boolean;

  @Column({ name: 'enable_comanda_qr_menu_only', type: 'boolean', default: false })
  enableComandaQrMenuOnly: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
