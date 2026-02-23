import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('comanda_validation_logs')
export class ComandaValidationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'comanda_id', type: 'uuid', nullable: true })
  comandaId: string;

  @Column({ name: 'comanda_number', type: 'int' })
  comandaNumber: number;

  @Column({ name: 'validator_token_id', type: 'uuid', nullable: true })
  validatorTokenId: string;

  @Column({ type: 'text' })
  status: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'items_count', type: 'int' })
  itemsCount: number;

  @CreateDateColumn({ name: 'validated_at' })
  validatedAt: Date;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo: any;
}
